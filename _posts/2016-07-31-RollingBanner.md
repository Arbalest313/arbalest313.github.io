---
layout:     post
title:      "ScrollView 视差滚动的轮播图"
subtitle:   "仿格瓦拉 Rolling Banner"
date:       2016-08-15
author:     "yuan"
header-img: "img/bg/20160815-RollingBanner-Paging.jpg"
tags:
    - Objective-C
    - iOS
    - UIKit
    - UIScrollView
    - 动画
---

## 前言
在绝大多数的APP中，产品经理都会要求有一个轮播图来展示重要的图片与信息。而大多数的轮播图都是比较僵硬的Side By Side的滑动动画。如何让这一个枯燥的UI组件变得有趣，并且有丝滑办的感觉呢？我想滚动视差会是一个不错的选择。

如果你经常使用格瓦拉，我想你也许就会注意到，格瓦拉的首页就有着这么一个有意思的视差滚动视图。让我们来尝试实现它吧。

![](https://github.com/Arbalest313/gitRecord/blob/master/RollingBanner/Gewala.gif?raw=true)


## 思考与观察

![](https://github.com/Arbalest313/gitRecord/blob/master/RollingBanner/Gewala-Slow.gif?raw=true)



在滑动`scrollView`时，仔细观察，你会发现在这个视差里面包含了两组动画

* 每当你向右滑动时，中间视图会跟随你的手指一起向右移动，但中间视图里面的图片则会朝左边的方向移动。 你向左滑动是则相反。
* 每当你向右滑动时，中间视图会跟随你的手指一起向右滑动，而左边的视图却朝向相反的方向移动。你向左滑动是则相反，右边的视图却朝向相反的方向移动

这时，我想你就应该想到，它并不是像大多数的滚动试图一样。不是使用N(你需要显示的图片数)+2个视图扑在`UIScrollView上`来实现, 而是使用了4个主要的视图:

```objc
@property (nonatomic, strong)UIView      * midContainter;
@property (nonatomic, strong)UIImageView * midImage;
@property (nonatomic, strong)UIImageView * leftImage;
@property (nonatomic, strong)UIImageView * rightImage;
```
其中，`midImage`是加载在`midContainer`上的，以产生第一组动画。而`midContainer、leftImage、rightImage`这三个视图有着不同的，层次之间的图层关系，中间图层`midContainer`总是处于另外两个图层的上方，同时三个图层的在`ScrollView`中的位置些许的重叠， 这里我们使用一个`portion`来统一标识重叠的比例

```objc
//中间视图与它的图片
_midContainter.frame = CGRectMake(self.bounds.size.width, 0, self.bounds.size.width, self.bounds.size.height);
_midContainter.clipsToBounds = YES;//超出bounds rect的视图讲不会显示
[self addSubview:_midContainter];

_midImage.frame = self.midContainter.bounds;
[self.midContainter addSubview:_midImage];

//左侧视图
_leftImage.frame = CGRectMake(self.bounds.size.width * (1- self.portion), 0, 0, self.bounds.size.width, self.bounds.size.height);
[self insertSubview:self.leftImage belowSubview:self.midImage];

//右侧视图
_rightImage.frame = CGRectMake(self.bounds.size.width * (1 + self.portion), 0, self.bounds.size.width, self.bounds.size.height);
[self insertSubview:self.rightImage belowSubview:self.midContainter];
```

## 初始化设置
知道我们需要哪些Views，下面就是对一我们的`ScrollView`和它的视图进行初始化的设置了：

```objc
//初始化设置
- (void)setup{
    self.contentSize = CGSizeMake(self.bounds.size.width*3, 0);
    self.contentOffset = CGPointMake(self.bounds.size.width, 0);
    self.portion = 0.6f;
    self.pagingEnabled = NO;
    self.showsVerticalScrollIndicator = NO;
    self.showsHorizontalScrollIndicator = NO;
    self.bounces = NO;
    self.layer.masksToBounds = YES;
}

//根据currentIndex重置srollView为最开始状态。
- (void)resetSubViews {
    self.midImage.image = self.sourceArr[self.pageControl.currentPage];
    self.midImage.tag = self.pageControl.currentPage;
    self.midImage.frame = self.midContainter.bounds;
    
    NSInteger leftIndex = self.pageControl.currentPage - 1;
    if (leftIndex < 0) {
        leftIndex = self.sourceArr.count - 1;
    }
    self.leftImage.image = self.sourceArr[leftIndex];
    self.leftImage.tag = leftIndex;
    self.leftImage.frame = CGRectMake(self.bounds.size.width * (1- self.portion), 0, 0, self.bounds.size.width, self.bounds.size.height);
    
    NSInteger rightIndex = self.pageControl.currentPage + 1;
    if (rightIndex >= self.sourceArr.count) {
        rightIndex = 0;
    }
    self.rightImage.image = self.sourceArr[rightIndex];
    self.rightImage.tag = rightIndex;
    self.rightImage.frame = CGRectMake(self.bounds.size.width * (1 +  self.portion), 0, self.bounds.size.width, self.bounds.size.height);
    
    [self bringSubviewToFront:self.midContainter];
    [self sendSubviewToBack:self.leftImage];
    [self sendSubviewToBack:self.rightImage];
    [self setContentOffset:CGPointMake(self.bounds.size.width, 0) animated:NO];    
    self.currentIndex = self.pageControl.currentPage;
}

```

## 实现

此外，为了能让这个视图循环滚动，我们还需要监听滚动时`UIScrollView`的`contentOffset.x`。在监听过程中，我们可以根据`self.portion`来调整每个视图的移动速度，以此来达到一个滚动视差的效果

```objc
- (void)scrollViewDidScroll:(UIScrollView *)scrollView {
    CGFloat moveX = scrollView.contentOffset.x - self.bounds.size.width;
    [self adjsutSubViews:moveX];
    if (fabs(moveX) >= self.bounds.size.width && fabs(self.lastMoveX) < self.bounds.size.width) {
    	[self completedHandler];
    }
    self.lastMoveX = moveX;
}

- (void)adjustSubViews:(CGFloat)moveX{
    [self move:self.midImage from:0 byX:moveX * (1 - self.portion)];
    [self move:self.leftImage from:self.bounds.size.width * (1- self.portion) byX:moveX * (1- self.portion)];
    [self move:self.rightImage from:self.bounds.size.width * (1 + self.portion) byX:(moveX) *  (1 - self.portion)];
}

#pragma mark - tools
- (void)move:(UIView *)view from:(CGFloat)start byX:(CGFloat)x {
    CGRect frame = view.frame;
    frame.origin.x = x + start;
    view.frame = frame;
}
```
这几行代码的意义：

1. 记录`scrollview` 相对于初始位置的移动距离`moveX`
2. 使`leftimage` 与 `rightImage`移动的速率与滑动距离`moveX`保持一个差值。
3. 使`midImage`与他的父视图`midContainer`的移动速率保持不一致。注意我们这里移动的是`midContainer`里的图片而不是`midContainer`
4. 如果当前的`moveX`已经已经是一张图片的宽度时，调起`completedHandler()`
4. 记录本次的`moveX`距离到`lastMoveX`里，以方便下一次使用。

> 由于RunLoop的缘故，`ScrollView`代理对`contentoffset`记录的不会非常准确。这里记录lastMoveX是因为我们想确保：当moveX大于一张图片宽度时，`completedHandler()`只被调起一次。不然可能会重复调用`completedHandler()`

在`completedHandler()`里面，我们需要做的是每当一张图片被完整显示在屏幕上时，不管他是`letfImage`还是`rightImage`,我们需要把这张图片重新赋值到`midContainer`的`midImage`上面，并根据这个图片的`index`计算出新的`leftImage`与`rightImage`，并欺骗用户。调用`resetSubViews()`,把`scrollView`的`offset`重新设置为初始值(显示中间视图)：

```objc
//重新计算letimage, midImage,rightImage的index
- (void)completedHandler{
    CGFloat moveX = self.contentOffset.x - self.bounds.size.width;
    if (fabs(moveX) >= self.bounds.size.width) {
        if (moveX > 0 && self.pageControl.currentPage + 1 < self.sourceArr.count) {
            self.pageControl.currentPage++;
        } else if (moveX >0 && self.pageControl.currentPage +1 == self.sourceArr.count) {
            self.pageControl.currentPage = 0;
        } else if (self.pageControl.currentPage >= 1){
            self.pageControl.currentPage--;
        } else if (self.pageControl.currentPage == 0 && moveX < 0) {
            self.pageControl.currentPage = self.sourceArr.count - 1;
        }
        [self resetSubViews];
    }
}
```
做完这些，在设置ScrollView的`pagingEnabled `属性为`YES`

```objc
    self.pagingEnabled = YES;
```
就可以大致完成一个简单的视差滚动视图了。看一下效果：
![](https://github.com/Arbalest313/gitRecord/blob/master/RollingBanner/RBPagingC.gif?raw=true)

完整的代码可以在[这里](https://github.com/Arbalest313/HYRollingBanner)下载。

但是这是你会发现，当你滑动你的视图时，视差滚动视图并没有像格瓦拉那样有如丝般顺滑的感觉。格瓦拉到底做了什么呢，你可以不妨思考一下？[下一篇，将优化我们的体验，带来如丝般的顺滑体验]()