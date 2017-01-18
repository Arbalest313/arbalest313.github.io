---
layout:     post
title:      "重定义你的XCode Console"
subtitle:   "iOS10 XCode8 Console Color Log 重定向Log"
date:       2017-01-16
author:     "yuan"
header-img: "img/bg/2017-01-17-RemoteConsole2.jpg"
tags:
    - iOS
    - Objective-C
    - XCode8
---

## 前言
----
自从`Xcode8`之后, 再也不能像以前一样愉快的使用插件了。之前赖以生存Console插件[XcodeColors](https://github.com/robbiehanson/XcodeColors) 也随之失效。我们再一次回到了原生只有黑白信息的Console上面。虽然可以用一些Formatting的Log来弥补，但依旧不是很直观。

每一次当测试机同事的手机器上有什么BUG需要查看日志的时候，可能还需要使用中间层代理来破解HTTPS查看请求，或者直接来找开发在Xcode里面查看Log。 过程还需要打包，查找，定位信息，繁琐无比。

作为一个攻城狮，完全不能忍。于是乎，一个远程查看Log与自定义的展现形式的Console的需求孕育而生:<br>

> 首先第一点，就是要抓取到所有的Log的同时还需要无任何的`侵入`性。 不可能因为这个需求把项目里面之前的各种Log重新写一遍。<br>

>其次第二点，就是我们的Console的展现要我们可以自己根据自己的需求来定义Console。并且可以远程查看。

先看效果：<br>
![](https://github.com/Arbalest313/gitRecord/blob/master/RemoteConsole/RemoteConsole.gif?raw=true)

着急看的同学可以直接下[Github源码](https://github.com/Arbalest313/RemoteConsole)


## 可行性调研
----

#### 抓取所有LOG
第一步查看NSLog的描述，发现他其实是使用`STDERR_FILENO`的文件描述符(File Descriptor)来写入的。若果你全局搜索`STDERR_FILENO `，iOS下面已经定义好的文件描述符：

```objc
 #define STDIN_FILENO 0 /* standard input file descriptor */
 #define STDOUT_FILENO 1 /* standard output file descriptor */
 #define STDERR_FILENO 2 /* standard error file descriptor */
```
方案一 ALS 读取Log<br>
苹果已经提供了读取Log的ALS API,在`asl.h`头文件里面，而且在StackOverFlow里面其实已经有人提过相应的问题并且贴出了[代码](http://stackoverflow.com/questions/6144347/using-objective-c-to-read-log-messages-posted-to-the-device-console). 可以通过设置参数来查询你想要的东西asl_search。 
但是在iOS10下 ALS被弃用了，使用新的OS.LOG系统。 所以他们只能被使用在iOS10之前的系统。

方案二 重定向文件描述符<br>
我们已经知道Log是写在STDERR_FILENO的文件描述符里面的， 那么我们可以再重新定向这个文件文件描述符到别的描述符里面，比如写到NSPipe中去：

```objc
int fildes[2];
pipe(fildes);  // [0] is read end of pipe while [1] is write end
dup2(fildes[1], STDERR_FILENO);  // Duplicate write end of pipe "onto" fd (this closes fd)
close(fildes[1]);  // Close original write end of pipe
fd = fildes[0];  // We can now monitor the read end of the pipe
```
> 其实也可以写到File里面去，但是磁盘的读写监听成本太高了。具体可以看这位同学写的[DCLog](https://github.com/DarielChen/DCLog)。

使用NSPipe配合Dispatch我们可以很轻易监听Pipe的read end事件：

```objc
	int readEnd = fildes[0];
	int writeEnd = fildes[1];
	
	//定义监听事件参数与线程
    dispatch_source_t source = dispatch_source_create(DISPATCH_SOURCE_TYPE_READ, readEnd, 0, dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_HIGH, 0));
    
    dispatch_source_set_cancel_handler(source, ^{
    	///取消时，回复原来的文件描述符
    });
    dispatch_source_set_event_handler(source, ^{
    	///有新的readEnd 监听获取内容
    }）
}
```
到这里我们就可以无痛的抓取到所有的Log了，并且获得与Console一样的实时更新信的回掉

#### 远程Console与样式
既然Xcode不能实现远程的Console与展现形式的自定义，那么我们为什么不换个地方呢？第一个想到的就是网页。我们可以在本地或者远程创建一个简单的`HTML5`静态页面。在程序内置一个小的WebSocket的服务器，用设备的ip做为连接标识。在获取监听Log的回掉里向`HTML5`发送内容。 而展现形式由`HTML5`自己去定义。

```javascript
//XcodeConsole.html
    var ipAddress = getUrlParameter('ip'); //获取模拟器或者真机的ip地址
    var wsUri ="ws://" + ipAddress + ":8081"; //拼接uri与端口 模拟器应该是ip=0:0:0:0
    //绑定webSocket端口
    function testWebSocket() {
	    var websocket = new WebSocket(wsUri); 
	    websocket.onopen = function(evt) { 
	        onOpen(evt) 
	    }; 
	    websocket.onclose = function(evt) { 
	        onClose(evt) 
	    }; 
	    websocket.onmessage = function(evt) { 
	        onMessage(evt) 
	    }; 
	    websocket.onerror = function(evt) { 
	        onError(evt) 
	    }; 
	}  
	function onOpen(evt) { 
        writeToScreen("CONNECTED"); 
    }  
 
    function onClose(evt) { 
        writeToScreen("DISCONNECTED"); 
    }  
 
    function onMessage(evt) { 
        writeToScreen(evt.data); 
    }  
```
![](/img/posts/RemoteConsole/html.jpg)

## RemoteConsole
----

接下来就是简单的把他们组合起来创建一个RemoteConsole, 

```objc
#import "RemoteConsole.h"
#import "PSWebSocketServer.h"
@interface RemoteConsole () <PSWebSocketServerDelegate>

@property (nonatomic, strong) PSWebSocketServer *server;//tiny webSocketServer
@property (nonatomic, strong, nullable)PSWebSocket * webSocket;//the webSocket

@property (nonatomic,assign) int originalStdHandle;//original file descriptor

@property (nonatomic,strong) dispatch_source_t sourt_t;//file descriptor mointor

@end
```
在开始与结束的时候分别重写与重置STDERR_FILENO的文件描述符

```objc
#pragma mark - PSWebSocketServerDelegate
_server = [PSWebSocketServer serverWithHost:nil port:8080];//指定端口为8080
_server.delegate = self;

- (void)serverDidStart:(PSWebSocketServer *)server {
    NSLog(@"Server did start…");
    if (_sourt_t) {
        dispatch_cancel(_sourt_t);
    }
    _sourt_t = [self startCapturingLogFrom:STDERR_FILENO];
}
- (void)serverDidStop:(PSWebSocketServer *)server {
    NSLog(@"Server did stop…");
    dispatch_cancel(_sourt_t);
}
```

抓取Log与重置Log

```objc
- (dispatch_source_t)startCapturingLogFrom:(int)fd  {
    int origianlFD = fd;
    _originalStdHandle = dup(fd);//save the original for reset proporse
    int fildes[2];
    pipe(fildes);  // [0] is read end of pipe while [1] is write end
    dup2(fildes[1], fd);  // Duplicate write end of pipe "onto" fd (this closes fd)
    close(fildes[1]);  // Close original write end of pipe
    fd = fildes[0];  // We can now monitor the read end of the pipe
    
    NSMutableData* data = [[NSMutableData alloc] init];
    fcntl(fd, F_SETFL, O_NONBLOCK);// set the reading of this file descriptor without delay
    __weak typeof(self) wkSelf = self;
    dispatch_source_t source = dispatch_source_create(DISPATCH_SOURCE_TYPE_READ, fd, 0, dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_HIGH, 0));
    
    int writeEnd = fildes[1];
    dispatch_source_set_cancel_handler(source, ^{
        close(writeEnd);
        if (wkSelf) {
            dup2(wkSelf.originalStdHandle, origianlFD);//reset the original file descriptor
        }
    });
    
    dispatch_source_set_event_handler(source, ^{
        @autoreleasepool {
            char buffer[1024 * 10];
            ssize_t size = read(fd, (void*)buffer, (size_t)(sizeof(buffer)));
            [data setLength:0];
            [data appendBytes:buffer length:size];
            NSString *aString = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
            [wkSelf.webSocket send:aString];
            printf("\n%s\n",[aString UTF8String]); //print on STDOUT_FILENO，so that logs can show on xcode console as well
        }
    });
    dispatch_resume(source);
    return source;
}
```
然后在适时的时候开启server即可。这样手机端就完成了，接下来就是远程的Console

#### XcodeConsole.html

之前我们已经获取了IP，并且建立了Socket的连接了，并且可以接受到数据。接下来就是我们要如何展示了：

```javascript
//XcodeConsole.html
function writeToScreen(message) { 
      var tr = document.createElement('tr');   
      var pre = document.createElement('pre');
      var td1 = document.createElement('td');
      var text1 = document.createTextNode(message);
      pre.appendChild(text1)
      td1.appendChild(pre);
      tr.appendChild(td1);

      var lowerM = message.toLowerCase()
      if (lowerM.indexOf("code = 0") >= 0 || lowerM.indexOf("error") >= 0 ||  lowerM.indexOf("exception") >= 0) {
        tr.style.background = "#E97E60"
      } else if (lowerM.indexOf("warning") >= 0) {
        tr.style.background = "#FACC9A"
      } else if (lowerM.indexOf("-- response") >= 0) {
        tr.style.color = "#5BBB7B"
      }
      
      output.appendChild(tr);
      footerElement.scrollIntoView(false);
      updateTimestamp();

    }  

```
当我们的log里面包含了不同的关键字时，我们赋予字体与背景不同的颜色，然后添加到页面的output元素中<br>

现在你就只需要把这个文件放入浏览器里面然后跟上你想要的`ip`参数就可以访问了`/XcodeConsole.html?ip=0.0.0.0`


![](https://github.com/Arbalest313/gitRecord/blob/master/RemoteConsole/RemoteConsole.gif?raw=true)


## 后续
----
到这里一个远程的Console Log就完成了。你所需要的就是修改ip所跟随的设备地址模拟器为0:0:0:0,真机可以去WIFI里面查看设比地址。
下一步可以把这个静态页面布置在测试服务器的内网上， 让所有人在内网都可以访问。再也不需要设置代理，或者xCode特意去查看了。

我把这个静态页面放在了[http://dev.hyyy.me/iOS/Console?ip=xxx]([http://dev.hyyy.me/iOS/Console?ip=xxx]) 下不过端口是在9001.需要的同学可以自行修改端口。

最后[Github源码](https://github.com/Arbalest313/RemoteConsole)

Reference：<br>
* [WWDC2017](https://forums.developer.apple.com/message/89962#89962)<br>
* [dup&dup2](https://linux.die.net/man/2/dup)<br>
* [Dari在杭州](http://www.jianshu.com/p/94b96ac1932b)<br>
* [Stack Overflow](http://stackoverflow.com/questions/6144347/using-objective-c-to-read-log-messages-posted-to-the-device-console)<br>
* [yohunl's ](https://yohunl.com/iosri-zhi-huo-qu-he-shi-shi-liu-lan-qi-xian-shi-ri-zhi/)<br>
* [PocketSocket](https://github.com/zwopple/PocketSocket)<br>