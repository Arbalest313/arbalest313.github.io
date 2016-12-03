---
layout:     post
title:      "有效提升Swift编译速度"
subtitle:   "Swift编译太慢, 提升编译速度, Swift Long Compile time"
date:       2016-12-1
author:     "yuan"
header-img: "img/bg/2016-12-1-SwfitCompileTimeSpeedingUp.jpg"
tags:
    - iOS
    - Swift
---
## 前言
----

Swift作为一个新兴的语言，有着苹果Dad(dy???)的支持与良好的社区环境。于是乎大家都开始慢慢尝试在项目中使用Swift。在我们的项目中也开始慢慢使用，但是过慢的编译时间真的是killing us。 完整的编译一次可能需要15到20分钟，完全不能忍。

先说结果，在我的电脑MacPro上，项目编译时间直接从以前`20m41s`缩短了`10m16s`。
而这10分钟仅仅只是从的代码层面带来的效果

## 定位问题
----

国外友人Robert已经为我们写好了一个Swift编译时间定位的工具【[请戳这里](https://github.com/RobertGummesson/BuildTimeAnalyzer-for-Xcode)】。 方便好用，可以立竿见影的找到问题代码。

> ps：以前也用XCTOOL但是xocde8已经不再支持build了，非常可惜。

## 代码优化
----

### 指定类型与拒绝泛型
原码：

```swift
var model : UILabel?
var cat : String?
var name : String?
var number : Int?
//build tiem : 8740.3ms
func sendData() {
    let parameter = ["model" : model?.text ?? "",
                     "cat" : cat ?? "",
                     "name" : name ?? "",
                     "number" : number ?? 0,
                     "dog" : "dog"]
    print("send request with parameter:\(parameter)")
}

```
这段代码所需要的编译时间是`8740.3ms`，就这么一个字典定义，我们竟然浪费了8秒！

**指定类型**之后我们再来看看

```swift
//build time: 3235.4ms
let parameter : [String : AnyObject] = ["model" : model?.text ?? "",
		                       "cat" : cat ?? "",
		                       "name" : name ?? "",
		                       "number" : number ?? 0,
		                       "dog" : "dog"]
```
这次所需要的编译时间就已经缩短为了`3235.4ms`，通过手动指定类型，我们缩短了`5s`以上的时间让费

再紧接，我们继续观察，这个parameter的字典其实可以全部为String，根本用不到AnyObject。

**指定特定的类型**

```swift
//build time: 200.3ms
let parameter : [String : String] = ["model" : model?.text ?? "",
					"cat" : cat ?? "",
					"name" : name ?? "",
					"number" : "\(number ?? 0)",
					"dog" : "dog"]
```
这次所需要的编译时间就已经缩短为了`200.3ms`，把AnyObject ->String ，我们缩短了`2s`以上的时间让费！！

所以如果你可以一种类型搞定，请千万别写`AnyObject`！！！


通过**指定正确的类型**我们从`8740ms`的编译时间缩短到了`200ms`！！！！


### 运算时`nil`保护抽离

```swift
//build time : 9804ms
func calculateSize(view : UIView?) -> CGSize{
    return CGSize(width: 10 + (view?.bounds.width ?? 0) + (view?.bounds.height ?? 0) + 22, height: 20)
}

//build time : 172ms
func calculateSize(view : UIView?) -> CGSize{
    let width = view?.bounds.width ?? 0
    let height = view?.bounds.height ?? 0
    return CGSize(width: 10 + width + height + 22, height: 20)
}

```

这段代码编译了`9804ms`,只是因为我们在运算的时候一并加入nil的保护。如果我们拆离nil保护，编译时间缩短了`98.3%`

> * 使用三目运算(Bool ? a : b)时也非常耗时，但还没有到非常严重的程度，一个三目可能需要额外的 `100ms` 到 `200ms`编译时间
> * 当你在字典中使用nil保护时，也可能造成极长的编译时间，有时候甚至会长达`20s`.但不是每次都出现。我理项目时就通过[BuildTimeAnalyzer](https://github.com/RobertGummesson/BuildTimeAnalyzer-for-Xcode)发现了很多这样的问题。比如:`["model" : model?.text ?? ""]`. 在通过把他们强制转化成想要的类型`String`后得到解决:`["model" : (model?.text ?? ""）as String]`。 暂时还不知道为什么。 猜测是因为 `model?.text` 的text属性是一个可选型， compiler花费了很长的时间来确定到底是`Optional(String)`还是`String`.但又不是每次都出现，非常奇怪。

### 少用`+`、`+=`运算符

```swift
//build time 1400.6ms
func arrPlusOperatos() {
    let arr1 = [1,2,3]
    let arr2 = [3,4,5]
    result += arr1 + arr2 + [10]
}
//build time 8.6ms
func arrPlusOperatos() {
    let arr1 = [1,2,3]
    let arr2 = [3,4,5]
    result.appendContentsOf(arr1)
    result.appendContentsOf(arr2)
    result.appendContentsOf([10])
}
```
尽量少的使用`+`、`+=`号来合并参数， 在项目中有一些array的合并编译时间高达`5000ms`.

> 对于`String`也是一样的,`String` 使用`\(value)`来合并值，或API给的append.

## 总结
----

上面的几个问题是在整理项目(Swift2.3)中，特别明显影响编译速度的点：

* 指定类型、拒绝泛型
* 运算时nil保护抽离、少用三目运算
* 少用+、+=运算符
缩短了我们接近50%的Swift编译时间。

具体大家可以用[BuildTimeAnalyzer](https://github.com/RobertGummesson/BuildTimeAnalyzer-for-Xcode)来查看项目哪些`func`存在严重的编译过长问题。

更多：

1. [regarding-swift-build-time-optimizations](https://medium.com/@RobertGummesson/regarding-swift-build-time-optimizations-fc92cdd91e31#.gv3w93fct)
2. [swift-compiler-performance-tips-and-tricks](https://engineering.circle.com/swift-compiler-performance-tips-and-tricks-e86a53a5b42a#.9e9576b0k)
3. [why-is-swift-compile-time-so-slow](http://stackoverflow.com/questions/25537614/why-is-swift-compile-time-so-slow)

## 后续
----

**框架**上的提高编译性能：

* 模块化代码，使用私有Cocoapods repository. 让不同模块以Framework或则.a文件的形式在项目里使用。如此每次编译的时候就只需要编译自己模块下的代码。其他模块的代码将会被编译后缓存，不需要重复编译。

其他一些优化包括：

* Find Implicit Dependencies Off [[1]](https://forums.developer.apple.com/message/89962#89962)
* Build Active Architecture Only Yes On Debug [[2]](http://useyourloaf.com/blog/2010/04/21/xcode-build-active-architecture-only.html)
* Precompile Prefix Header set to YES [[3]](http://blog.csdn.net/qq_25131687/article/details/52194034)
* RAM Disk [[4]](http://nszzy.me/2016/03/20/reduce-xcode-build-times/)`没有尝试过，有机会可以试一下`


另外还有一个些文章说可以提高Xcode的`编译线程`数量，但通过查看defaults，并有找到相关的设置还需要继续探索。




