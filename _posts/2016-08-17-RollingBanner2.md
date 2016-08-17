---
layout:     post
title:      "UIScrollView视差滑动轮播图（二） 优化"
subtitle:   "仿格瓦拉 Parallax Rolling Banner iOS"
date:       2016-08-16
author:     "yuan"
header-img: "img/bg/20160815-RollingBanner-Paging.jpg"
tags:
    - Objective-C
    - iOS
    - UIKit
    - UIScrollView
    - UX
---

## 前言
在[上一篇](http://hyyy.me/2016/08/15/RollingBanner/)中，我们实现了一个视差滚动的轮播图，但是它是由通过设置`UIScrollView`的`pageEnable`的属性来实现的。 然而你会发现他并没有像格瓦拉的滚动视图那样丝滑，减速动画阻尼巨大
格瓦拉的滚动视图：
![](https://github.com/Arbalest313/gitRecord/blob/master/RollingBanner/Gewala.gif?raw=true)


## 优化思路
既然系统提供的分页方式不能满足我们，那么我们如何自己实现一个paging的效果呢？答案就在Apple的官方文档里面，在查阅`UIScrollView`的代理后，我们可以发现里面有这样一个代理方法：

```objc
//scrollView	The scroll-view object where the user ended the touch..
//velocity	The velocity of the scroll view (in points) at the moment the touch was released.
//targetContentOffset	The expected offset when the scrolling action decelerates to a stop.
//Your application can change the value of the targetContentOffset parameter to adjust where the scrollview finishes its scrolling animation.

- (void)scrollViewWillEndDragging:(UIScrollView *)scrollView
                     withVelocity:(CGPoint)velocity
              targetContentOffset:(inout CGPoint *)targetContentOffset
```
在这个方法中有一个`targetContentOffset`的参数，文档里指出，我们可以通过修改这个参数，来改变`scrollView`在滑动动画结束时的位置。 Bingo， 这就是我们想要的！通过修改`targetContentOffset`直接修改目标offset为整数页位置

## 实现
我们所需要的paging：

* 设置滑动阻尼，当滑动没有达到滑动阻尼位置时，标记这次滑动为`cancel`，并修改`targetContentOffset.x`为起始位置 `self.bounds.size.width`
* 当已经超过滑动阻尼时， 标记这次滑动为`complete`,并通过滑动方向计算相应的`targetContentOffset.x`结束位置为 `0`或者 `self.bounds.size.width * 2`

核心代码：

```objc
- (CGFloat)targetOffsetForMoveX:(CGFloat)moveX velocity:(CGFloat)velocity{
    BOOL complete = fabs(moveX) >= self.bounds.size.width * 0.3 ||
                    (fabs(velocity) > 0 && fabs(moveX) >= self.bounds.size.width * 0.1 )? YES : NO;
    BOOL leftDirection = moveX > 0 ? YES : NO;
    if (complete) {
        if (leftDirection) {
            return self.bounds.size.width * 2;
        }
        return 0; //right Direction
    }else {
        return self.bounds.size.width;//cancel
    }
}

- (void)scrollViewWillEndDragging:(UIScrollView *)scrollView withVelocity:(CGPoint)velocity targetContentOffset:(inout CGPoint *)targetContentOffset {
    if (self.pagingEnabled)return;
    CGFloat moveX = scrollView.contentOffset.x - self.bounds.size.width;
    CGFloat targetX = [self targetOffsetForMoveX:moveX velocity:velocity.x];
    if (targetX == self.bounds.size.width) {//cancel
        targetContentOffset->x = scrollView.contentOffset.x;
        [self setContentOffset:CGPointMake(targetX, targetContentOffset->y) animated:YES];
    } else {//complete
        targetContentOffset->x = targetX;
    }
}
```
`注意`在这里我们做了一些优化，当滑动被判断为cancel时，我们并没有直接把其实位置`self.bounds.size.width `赋值给`targetContentOffset->x`。那是因为，经常我们的滑动的时候会伴随加速度`velocity.x`。当`targetContentOffset->x`与`scrollView`的`contentOffset.x`非常相近，又伴随加速度`velocity.x`时，cancel的滑动动画的持续时间就会非常短。这带来的滑动体验非常不好。

在这里，我们放弃修改`targetContentOffset->x`为起始值，转而直接把他赋值为当前的`contentOffset.x`，这样滑动手势所带来的`velocity.x`就不会影响到cancel的滑动动画;同时我们再使用系统自带的方法来完成这个cancel的结束动画

```objc
[self setContentOffset:CGPointMake(targetX, targetContentOffset->y) animated:YES] 
```

## RunLoop 与 targetContentOffset
如果你注意观察，你会发现：当我们修改`scrollView`的`targetContentOffset`时，`scrollView`会有一次准确的`contentOffset`等于`targetContentOffset`的回调`-scrollViewDidScroll:`。我们暂时把这个回调叫作`准确回调`

> 由于RunLoop的原故，在代理方法`-(void)scrollViewDidScroll:`中对于`scrollView`的`contentOffset`监听非常不精确。所以我们很可能拿到和我们所期望值不一样的`contentOffset`

如果我们在最接近`准确回调`的回调里修改了`scrollView`的`contentOffset`，ie: 设置`contentOffset.x`为`self.bounds.size.width`，同时紧接着在`准确回掉`里又把`contentOffset.x`设置为其它值。 那么`-(void)scrollViewDidScroll:`里面对于视图位置的修改可能就会出现错误。因此我们需要加一些处理：

```objc
- (void)scrollViewDidScroll:(UIScrollView *)scrollView {
    CGFloat moveX = scrollView.contentOffset.x - self.bounds.size.width;
    if (fabs(self.lastMoveX)>= self.bounds.size.width) {
        //prevent method scrollViewWillEndDragging: withVelocity: targetContentOffset: reload the image postion, 
        //so we reset scrollview to init postion and return,
        [self resetSubViews];
        self.lastMoveX = 0;
        return;
    }
    
    [self adjustSubViews:moveX];
    
    if (fabs(moveX) >= self.bounds.size.width) {
        [self completedHandler];
    }
    self.lastMoveX = moveX;
}
```
到这里，我们使用`targetContentOffset`来实现Paging的效果就结束了。 我们来看一下效果对比：

<center>targetContentOffset</center>
![](https://github.com/Arbalest313/gitRecord/blob/master/RollingBanner/RBTargetX-C.gif?raw=true)
<br>
<center>pageEnable</center>
![](https://github.com/Arbalest313/gitRecord/blob/master/RollingBanner/RBPagingC.gif?raw=true)

GIF可能不是很明显，如果你[下载了项目](https://github.com/Arbalest313/HYRollingBanner)，运行起来。你将会看到非常明显的差异

## 总结
当你同时在`-(void)scrollViewDidScroll:`与`- (void)scrollViewWillEndDragging:withVelocity:targetContentOffset:`里面对`contentOffset`做修改时你需要格外小心。因为RunLoop的原故,`contentOffset `检测是十分不精确的.在你修改`contentOffset`时，`-(void)scrollViewDidScroll:`会被反复调起。

使用pageEnable实现分页，你将会失去：

* 如丝般的顺滑
* 只能以frame size为单位翻页，减速阻尼巨大，减速过程不超过一页
* 不能自由控制动画complete与cancel的的滑动比例

使用`targetContentOffset`实现Paging，减速过程流畅。并且可以实现一屏多页的效果。大家可以自行发挥。 


想体验[如丝般顺滑请戳这里](https://github.com/Arbalest313/HYRollingBanner)


