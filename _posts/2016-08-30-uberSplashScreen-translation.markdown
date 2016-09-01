---
layout:     post
title:      "一步步实现Uber/优步开屏动画"
subtitle:   "iOS Uber/优步开屏动画 Swift Logo 翻译 "
date:       2016-08-30
author:     "yuan"
header-img: "img/bg/20160830-UberSplashScreen2.jpg"
tags:
    - Swift
    - iOS
    - CoreAnimation
    - UX
    - 翻译
---
 > 原作者：[Derek Selander](https://www.raywenderlich.com/u/lolgrep) 2016/08/01 [原文](https://www.raywenderlich.com/133224/how-to-create-an-uber-splash-screen)
 >
 > 翻译: [yuan](http://hyyy.me) 2016/08/30
 
很多App都需要一些必要的数据来启动程序。在启动时，App就会向服务器发起请求并等待这些数据的返回。所以开屏动画就需要扮演一个重要的角色：在等待程序完全启动时，不让用户感到乏味。

16年的上半年，[Uber决定重新设立品牌形象与Logo](http://www.wired.com/2016/02/the-inside-story-behind-ubers-colorful-redesign/)。其中就包含了一个重新设计的炫酷的开屏动画。

这篇文章将会尝试复现一个与Uber开屏动画非常相近的效果。其中会用到`CALayers`与`CAAnimations`相关一些类。这篇文章将会更侧重实现，其中包含的一些动画的概念，可以在点击订阅[ Marin Todorov’s Intermediate iOS Animation video series.](https://www.raywenderlich.com/u/icanzilb)来了解详情。

## 初始

在这篇文章中你将会用到非常多的动画，你可能需要一个已经创建好`CALayer`的[起始项目](https://cdn2.raywenderlich.com/wp-content/uploads/2016/06/Fuber-starter.zip)

这个项目被命名为`Fuber`，Fuber是一个共享出行理念的App。用户可以发起一个[平衡车](https://en.wikipedia.org/wiki/Segway_PT)分享需求给平衡车司机，同时要求司机把你从一个地方送到另外一个地方。`Fuber`正在快速的增长并且已经渗入了60多个国家。 但`Fuber`遭遇到了一些当地政府与平衡车工会的抵制。

![](/img/posts/UberSplash/fuber_logo.png)

在这篇文章的结束， 你将会实现一个这样的开屏动画:

![](/img/posts/UberSplash/Fuber-Animation.gif)

尝试运行的起始项目

项目最开始会调起`RootContainerViewController`。同时`RootContainerViewController `调起子控制器`SplashViewController`。`RootContainerViewController`会一直展示开屏动画直到App已经准备好启动。这就像我们的App在与服务器进行数据请求时的交互一样。在这次的项目里，开屏动画将会有自己的结束逻辑。

`RootContainerViewController`主要实现了两个方法 `showSplashViewController()`与`showSplashViewControllerNoPing()`。为了方便观察，我们将会使用`showSplashViewControllerNoPing()`来创建一个无限循环的开屏动画。在完成这篇教程后，你可以尝试使用`showSplashViewController()`来模拟真实的API请求。

## 开屏动画视图与图层结构
`SplashViewController`的视图包含了两个子视图。第一个子视图包含了一个`TileGridView`波浪形网视图的背景。这个网状视图其实是一个网格式的布局，类似`UICollectionView`，每一个网格里包含了一个`TileView`。另外一个子视图是`AnimatedULogoView `,一个‘U'形的动画层。

![](/img/posts/UberSplash/Fuber-View-Hierarchy-1.png)

`AnimatedULogoView`包含了4个`CAShapeLayer`:

* `circleLayer`代表的是‘U’形的圆形的背景
* `lineLayer`是一条直线，从`circleLayer`的中间延伸到边缘
* `squareLayer`一个位于`circleLayer`中间的正方形
* `maskLayer`用于遮盖子视图。用来组合其他视图，简单的实现一个遮盖子视图的效果

这些图层组合起来， 将会是Fuber的‘U’

![](/img/posts/UberSplash/RiderIconView.gif)

现在你已经知道你所需要的组合视图结构，可以去尝试让他们动起来了。

## 圆圈动画

为了方便观察动画的效果，我们可以把其他不需要的图层注释掉。在`AnimatedULogoView.swift `文件里找到`init(frame:)`方法，把除了`circleLayer `的其他的三个图层全部注释掉。之后我们再慢慢一步一步把他们还原回来。代码：

```swift
override init(frame: CGRect) {
  super.init(frame: frame)
 
  circleLayer = generateCircleLayer()
  lineLayer = generateLineLayer()
  squareLayer = generateSquareLayer()
  maskLayer = generateMaskLayer()
 
//  layer.mask = maskLayer
  layer.addSublayer(circleLayer)
//  layer.addSublayer(lineLayer)
//  layer.addSublayer(squareLayer)
}
```

在`generateCircleLayer()`里创建圆形，使用了`CAShapeLayer`并且再创建了一个`UIBezierPath`：

```swift
layer.path = UIBezierPath(arcCenter: CGPointZero, radius: radius/2, startAngle: -CGFloat(M_PI_2), endAngle: CGFloat(3*M_PI_2), clockwise: true).CGPath
```
如果你使用0为起始角度，贝塞尔曲线将会从时钟的3点位置开始。为了从时钟的12点位置开始，把起始角度为`-M_PI_2`，-90度。并且设置你的结束角度为`3*M_PI_2`，270度，再次回到时钟的12点位置。这样你就会有一个闭合圆圈。注意，这里你想连动的是`stroke`属性，所以你使用`radius`值作为`lineWidth`的值。

这个`circleLayer`的动画需要组合3个组`CAAnimation`：一个`CAKeyframeAnimation`动画关联`strokeEnd`、一个`CABasicAnimation`动画关联`transform`与`CAAnimationGroup`组合前两个动画到一起。

定位到` animateCircleLayer() `方法，然后添加下面的代码

```swift
 // strokeEnd
  let strokeEndAnimation = CAKeyframeAnimation(keyPath: "strokeEnd")
  strokeEndAnimation.timingFunction = strokeEndTimingFunction
  strokeEndAnimation.duration = kAnimationDuration - kAnimationDurationDelay
  strokeEndAnimation.values = [0.0, 1.0]
  strokeEndAnimation.keyTimes = [0.0, 1.0]
```
设置动画的`values`属性为0.0到1.0，标识从起始角度开始一路绘制到圆的结束角度。类似一个顺时针动画。当这个动画的关键字`strokeEnd`的值慢慢增加，线的宽度也会慢慢增加，这个圆就会被慢慢填充。如果这时，你把`values`改成从0.0到0.5，只有一个半圆会被显示出来。 这是因为绘制路径`strokeEnd`停止在了半程0.5

添加`transform`动画

```swift
 // transform
  let transformAnimation = CABasicAnimation(keyPath: "transform")
  transformAnimation.timingFunction = strokeEndTimingFunction
  transformAnimation.duration = kAnimationDuration - kAnimationDurationDelay
 
  var startingTransform = CATransform3DMakeRotation(-CGFloat(M_PI_4), 0, 0, 1)
  startingTransform = CATransform3DScale(startingTransform, 0.25, 0.25, 1)
  transformAnimation.fromValue = NSValue(CATransform3D: startingTransform)
  transformAnimation.toValue = NSValue(CATransform3D: CATransform3DIdentity)
```
这组动画包含了等比放大缩小与z轴的旋转。`circleLayer`图层慢慢变大，同时伴随顺时针45度的旋转。这个旋转的动画需要与`lineLayer`的旋转动画保持一直。

最后，添加一个`CAAnimationGroup`。这个动画包含了上面的两组动画，这样我们就只需要添加一个动画在`circleLayer`的图层上

```swift
  // Group
  let groupAnimation = CAAnimationGroup()
  groupAnimation.animations = [strokeEndAnimation, transformAnimation]
  groupAnimation.repeatCount = Float.infinity
  groupAnimation.duration = kAnimationDuration
  groupAnimation.beginTime = beginTime
  groupAnimation.timeOffset = startTimeOffset
 
  circleLayer.addAnimation(groupAnimation, forKey: "looping")
```
这个`CAAnimationGroup`有两个重要属性需要注意：`beginTime` 与 `timeOffset`。如果你对这两个属性不太熟悉，可以查看[这篇文章](http://ronnqvi.st/controlling-animation-timing/)。

这个组合动画的`beginTime`被设置为了父视图的动画开始时间。
因为这个动画第一次运行时的成像不是从0开始的，所以`timeOffset`也被设置了。
你可以尝试改变`startTimeOffset`的值。观察改变后所带来的效果。

把`groupAnimation`赋值给`circleLayer`后，运行查看效果，应该与这个一样：

![](/img/posts/UberSplash/CircleIn-Animation.gif)

> 提示： 你可以尝试去除中间的任何一个动画，来查看另一个动画的效果。尝试去改变他们的属性，你会有所启发。下面的所有组合动画你都可以这样去观察它们。

## 直线动画
现在可以尝试把`lineLayer`的动画添加进去了。 还是在`AnimatedULogoView.swift`的` startAnimating() `方法里面去除`animateLineLayer()`的注释。同时把其他的动画注释掉。

```swift
public func startAnimating() {
  beginTime = CACurrentMediaTime()
  layer.anchorPoint = CGPointZero
 
//  animateMaskLayer()
//  animateCircleLayer()
  animateLineLayer()
//  animateSquareLayer()
}

```
在`init(frame:)`方法里，把里面的代码改为只有`circleLayer `与`lineLayer`图层显示

```swift
override init(frame: CGRect) {
  super.init(frame: frame)
 
  circleLayer = generateCircleLayer()
  lineLayer = generateLineLayer()
  squareLayer = generateSquareLayer()
  maskLayer = generateMaskLayer()
 
//  layer.mask = maskLayer
  layer.addSublayer(circleLayer)
  layer.addSublayer(lineLayer)
//  layer.addSublayer(squareLayer)
}
```
找到`animateLineLayer()`方法，输入下个组合动画：

```swift
  // lineWidth
  let lineWidthAnimation = CAKeyframeAnimation(keyPath: "lineWidth")
  lineWidthAnimation.values = [0.0, 5.0, 0.0]
  lineWidthAnimation.timingFunctions = [strokeEndTimingFunction, circleLayerTimingFunction]
  lineWidthAnimation.duration = kAnimationDuration
  lineWidthAnimation.keyTimes = [0.0, 1.0-kAnimationDurationDelay/kAnimationDuration, 1.0]
```
这组动画会增加粗线的宽再变细线的宽。

继续添加下一组动画：

```swift
 // transform
  let transformAnimation = CAKeyframeAnimation(keyPath: "transform")
  transformAnimation.timingFunctions = [strokeEndTimingFunction, circleLayerTimingFunction]
  transformAnimation.duration = kAnimationDuration
  transformAnimation.keyTimes = [0.0, 1.0-kAnimationDurationDelay/kAnimationDuration, 1.0]
 
  var transform = CATransform3DMakeRotation(-CGFloat(M_PI_4), 0.0, 0.0, 1.0)
  transform = CATransform3DScale(transform, 0.25, 0.25, 1.0)
  transformAnimation.values = [NSValue(CATransform3D: transform),
                               NSValue(CATransform3D: CATransform3DIdentity),
                               NSValue(CATransform3D: CATransform3DMakeScale(0.15, 0.15, 1.0))]

```
就像`circleLayer`的动画一样，这里你也会在z轴上旋转他，并改变他的大小。 但是在这个视图里面， 你先把他缩小到原比例的25%，再马上把他回放到原来的尺寸。最后再把他缩小到原比例的15%大小。

把这两组动画放进`CAAnimationGroup`里面赋值给`lineLayer`:

```swift
  // Group
  let groupAnimation = CAAnimationGroup()
  groupAnimation.repeatCount = Float.infinity
  groupAnimation.removedOnCompletion = false
  groupAnimation.duration = kAnimationDuration
  groupAnimation.beginTime = beginTime
  groupAnimation.animations = [lineWidthAnimation, transformAnimation]
  groupAnimation.timeOffset = startTimeOffset
 
  lineLayer.addAnimation(groupAnimation, forKey: "looping")
```
运行，查看他的效果

![](/img/posts/UberSplash/Knockoutline-Animation.gif)

这里的起始旋转位置与`circleLayer`的起始旋转位置一致`-M_PI_4`。同时把关键帧时间`keyTimes`设置为`[0.0, 1.0-kAnimationDurationDelay/kAnimationDuration, 1.0]`。这个组数的起始与结束值非常明显为0.0与1.0，开始与结束。这个中间值是圆形绘制完成，转换为缩小的关键时间点。用`kAnimationDurationDelay`除以`kAnimationDuration`得到延迟的百分比。然后在用1减去这个百分比，来获取圆形图层的真实动画时间百分比。

现在可以移动到下一个正方形的动画上了。

## 正方形动画的实现

和上面的步奏类似，找到`startAnimating()`方法，注释掉除了`animateSquareLayer()`以外的其他动画。同时在`init(frame:)`里面改变代码为：

```swift
override init(frame: CGRect) {
  super.init(frame: frame)
 
  circleLayer = generateCircleLayer()
  lineLayer = generateLineLayer()
  squareLayer = generateSquareLayer()
  maskLayer = generateMaskLayer()
 
//  layer.mask = maskLayer
  layer.addSublayer(circleLayer)
//  layer.addSublayer(lineLayer)
  layer.addSublayer(squareLayer)
}
```
跳到`animateSquareLayer()`方法，添加下面动画：

```swift
// bounds
  let b1 = NSValue(CGRect: CGRect(x: 0.0, y: 0.0, width: 2.0/3.0 * squareLayerLength, height: 2.0/3.0  * squareLayerLength))
  let b2 = NSValue(CGRect: CGRect(x: 0.0, y: 0.0, width: squareLayerLength, height: squareLayerLength))
  let b3 = NSValue(CGRect: CGRectZero)
 
  let boundsAnimation = CAKeyframeAnimation(keyPath: "bounds")
  boundsAnimation.values = [b1, b2, b3]
  boundsAnimation.timingFunctions = [fadeInSquareTimingFunction, squareLayerTimingFunction]
  boundsAnimation.duration = kAnimationDuration
  boundsAnimation.keyTimes = [0, 1.0-kAnimationDurationDelay/kAnimationDuration, 1.0]

```
这部分动画改变`CALayer`的`bounds`属性。 图形的边框长度从2/3变化到1，再变化到0。

接着 改变图形的背景颜色：

```swift
 // backgroundColor
  let backgroundColorAnimation = CABasicAnimation(keyPath: "backgroundColor")
  backgroundColorAnimation.fromValue = UIColor.whiteColor().CGColor
  backgroundColorAnimation.toValue = UIColor.fuberBlue().CGColor
  backgroundColorAnimation.timingFunction = squareLayerTimingFunction
  backgroundColorAnimation.fillMode = kCAFillModeBoth
  backgroundColorAnimation.beginTime = kAnimationDurationDelay * 2.0 / kAnimationDuration
  backgroundColorAnimation.duration = kAnimationDuration / (kAnimationDuration - kAnimationDurationDelay)

```
注意`fillMode`属性。因为`beginTime`不是0，在动画开始与结速的时候`CGColor`可能会没有值。当这个动画添加到父类的组合动画时，为了不会有闪烁的不良体验，我们需要把属性赋值为`kCAFillModeBoth`，

接着添加进组合动画

```swift
 // Group
  let groupAnimation = CAAnimationGroup()
  groupAnimation.animations = [boundsAnimation, backgroundColorAnimation]
  groupAnimation.repeatCount = Float.infinity
  groupAnimation.duration = kAnimationDuration
  groupAnimation.removedOnCompletion = false
  groupAnimation.beginTime = beginTime
  groupAnimation.timeOffset = startTimeOffset
  squareLayer.addAnimation(groupAnimation, forKey: "looping")

```
运行并且查看效果:

![](/img/posts/UberSplash/KnockoutSquare-Animation.gif)

> 注意：运行动画在模拟器上可能会有一些不一样，因为你的电脑在模拟一个iOS设备的GPU。 如果你的动画效果真的不一样，尝试切换到一个小屏幕的模拟器上，或者切换到真机上

## 遮挡图层

现在是时候把上面所有的动画组合起来了。去除掉所有在`init(frame:)`与`startAnimating()`的注释。 然后运行：

![](/img/posts/UberSplash/PreMask-Animation.gif)

看起来还是有一点不一样。动画有一个突然的图框`bounds`改变的效果，并不是渐变的，因为`circleLayer`的`bounds`突然缩小到了0。 我们可以用一个`masklayer`来弥补这一切。一次性缩小所有子图层

找到`animateMaskLayer()`添加代码

```swift
// bounds
  let boundsAnimation = CABasicAnimation(keyPath: "bounds")
  boundsAnimation.fromValue = NSValue(CGRect: CGRect(x: 0.0, y: 0.0, width: radius * 2.0, height: radius * 2))
  boundsAnimation.toValue = NSValue(CGRect: CGRect(x: 0.0, y: 0.0, width: 2.0/3.0 * squareLayerLength, height: 2.0/3.0 * squareLayerLength))
  boundsAnimation.duration = kAnimationDurationDelay
  boundsAnimation.beginTime = kAnimationDuration - kAnimationDurationDelay
  boundsAnimation.timingFunction = circleLayerTimingFunction
```
这些代码改变边框大小。 当边框大小改变时，整个`AnimatedULogoView`会慢慢消失，因为这个图层是所有子图层的遮挡图层。

添加圆角给这个图层：


```swift
  // cornerRadius
  let cornerRadiusAnimation = CABasicAnimation(keyPath: "cornerRadius")
  cornerRadiusAnimation.beginTime = kAnimationDuration - kAnimationDurationDelay
  cornerRadiusAnimation.duration = kAnimationDurationDelay
  cornerRadiusAnimation.fromValue = radius
  cornerRadiusAnimation.toValue = 2
  cornerRadiusAnimation.timingFunction = circleLayerTimingFunction
```
把动画组合在一个`CAAnimationGroup`里面

```swift
  // Group
  let groupAnimation = CAAnimationGroup()
  groupAnimation.removedOnCompletion = false
  groupAnimation.fillMode = kCAFillModeBoth
  groupAnimation.beginTime = beginTime
  groupAnimation.repeatCount = Float.infinity
  groupAnimation.duration = kAnimationDuration
  groupAnimation.animations = [boundsAnimation, cornerRadiusAnimation]
  groupAnimation.timeOffset = startTimeOffset
  maskLayer.addAnimation(groupAnimation, forKey: "looping")
```

再次运行:

![](/img/posts/UberSplash/RiderIconView-Animation.gif)

## 网视图

`TileGridView`背景网状图包含了一系列的`TileViews`。在`TileView.swift`里面找到`init(frame:)`方法，然后添加下面的代码:

```switf
layer.borderWidth = 2.0
```
运行后查看效果：

![](/img/posts/UberSplash/Fuber-Grid-View-180x320.png)

你可以看见，`TileView`是被平铺像网格一样的布局在父视图上的。在`TileGridView.swift`的` renderTileViews()`方法里面找到这个网格的创建逻辑。这个逻辑已经创建好了，我们只需要关注如何实现我们的动画。

## 网视图动画

`TileGridView`只有一个子视图叫`containerView`。它包含了所有的`TileView`。同时，还有一个属性叫`titleViewRow`，它是一个二维的数组包含了所有的`TileView`。

在`TileView`的`init(frame:)`方法里，删掉掉刚刚添加的边宽代码。然后去除掉给`layer.coents`添加`chimeSplashImage`图片的注释：

```swift
override init(frame: CGRect) {
  super.init(frame: frame)
  layer.contents = TileView.chimesSplashImage.CGImage
  layer.shouldRasterize = true
}
```
运行查看效果：

![](/img/posts/UberSplash/Grid-Starting.gif)

已经小有样子了

`TileGridView`与它所有的`TileViews`还需要一些动画。在`TileView.swift`中找到`startAnimatingWithDuration(_:beginTime:rippleDelay:rippleOffset:)`方法，然后输入下面的代码：

```swift
 let timingFunction = CAMediaTimingFunction(controlPoints: 0.25, 0, 0.2, 1)
  let linearFunction = CAMediaTimingFunction(name: kCAMediaTimingFunctionLinear)
  let easeOutFunction = CAMediaTimingFunction(name: kCAMediaTimingFunctionEaseOut)
  let easeInOutTimingFunction = CAMediaTimingFunction(name: kCAMediaTimingFunctionEaseInEaseOut)
  let zeroPointValue = NSValue(CGPoint: CGPointZero)
 
  var animations = [CAAnimation]()
```
这段代码声明了一些时间曲线，将在下面的代码中用到:

```swift
  if shouldEnableRipple {
    // Transform.scale
    let scaleAnimation = CAKeyframeAnimation(keyPath: "transform.scale")
    scaleAnimation.values = [1, 1, 1.05, 1, 1]
    scaleAnimation.keyTimes = TileView.rippleAnimationKeyTimes
    scaleAnimation.timingFunctions = [linearFunction, timingFunction, timingFunction, linearFunction]
    scaleAnimation.beginTime = 0.0
    scaleAnimation.duration = duration
    animations.append(scaleAnimation)
 
    // Position
    let positionAnimation = CAKeyframeAnimation(keyPath: "position")
    positionAnimation.duration = duration
    positionAnimation.timingFunctions = [linearFunction, timingFunction, timingFunction, linearFunction]
    positionAnimation.keyTimes = TileView.rippleAnimationKeyTimes
    positionAnimation.values = [zeroPointValue, zeroPointValue, NSValue(CGPoint:rippleOffset), zeroPointValue, zeroPointValue]
    positionAnimation.additive = true
 
    animations.append(positionAnimation)
  }
```
`shouldEnableRipple`是一个布尔值，用来控制是否需要添加形状与位置的变化到动画里面。在之前提到的`renderTileViews()`方法里面，这个值已经被设置为了`true`。

透明度的动画：

```swift
 // Opacity
  let opacityAnimation = CAKeyframeAnimation(keyPath: "opacity")
  opacityAnimation.duration = duration
  opacityAnimation.timingFunctions = [easeInOutTimingFunction, timingFunction, timingFunction, easeOutFunction, linearFunction]
  opacityAnimation.keyTimes = [0.0, 0.61, 0.7, 0.767, 0.95, 1.0]
  opacityAnimation.values = [0.0, 1.0, 0.45, 0.6, 0.0, 0.0]
  animations.append(opacityAnimation)

```
这段代码非常直接了当的设置了不同的透明度在不同的关键帧上`keyTimes`

把这些动画组合起来：

```swift
 // Group
  let groupAnimation = CAAnimationGroup()
  groupAnimation.repeatCount = Float.infinity
  groupAnimation.fillMode = kCAFillModeBackwards
  groupAnimation.duration = duration
  groupAnimation.beginTime = beginTime + rippleDelay
  groupAnimation.removedOnCompletion = false
  groupAnimation.animations = animations
  groupAnimation.timeOffset = kAnimationTimeOffset
 
  layer.addAnimation(groupAnimation, forKey: "ripple")
```
把这个动画组赋值给`TileView`。根据`shouldEnableRipple`的值，这个动画组合可能有一个或者三个动画。

在`TileGridView`中调用每个子视图`TileView`来开启这段动画。找到`TileGridView.swift`的`startAnimatingWithBeginTime(_:):
`方法写入：

```swift
private func startAnimatingWithBeginTime(beginTime: NSTimeInterval) {
  for tileRows in tileViewRows {
    for view in tileRows {
      view.startAnimatingWithDuration(kAnimationDuration, beginTime: beginTime, rippleDelay: 0, rippleOffset: CGPointZero)
    }
  }
}

```
然后运行：

![](/img/posts/UberSplash/Grid-1.gif)

但是这个时候`AnimatedULogoView`还需要一个波浪式的外推的效果。我们需要给每一个`TileView`设置一个延迟值。这个值将会根据他们距离中心图层的位置来设定，最后再乘一个常量：

在靠近`startAnimatingWithBeginTime(_:)`的地方，添加一个段新函数：

```swift
private func distanceFromCenterViewWithView(view: UIView)->CGFloat {
  guard let centerTileView = centerTileView else { return 0.0 }
 
  let normalizedX = (view.center.x - centerTileView.center.x)
  let normalizedY = (view.center.y - centerTileView.center.y)
  return sqrt(normalizedX * normalizedX + normalizedY * normalizedY)
}
```
一个简单计算距离的方法

回到`startAnimatingWithBeginTime(_:)`写入下面的代码：

```swift
  for tileRows in tileViewRows {
    for view in tileRows {
      let distance = self.distanceFromCenterViewWithView(view)
 
      view.startAnimatingWithDuration(kAnimationDuration, beginTime: beginTime, rippleDelay: kRippleDelayMultiplier * NSTimeInterval(distance), rippleOffset: CGPointZero)
    }
  }
```
这段代码调用`distanceFromCenterViewWithView(_:)`后再计算相应的每个视图的延迟时间

运行：

![](/img/posts/UberSplash/Grid-2.gif)

越来接近我们想要的效果了。但还是缺失了点什么。那就是矢量性质的移动。每一个`TileView`需要根据波浪的向外推动原理，设置一个矢量性的移动(大小与方向)。

回想起我们的高中数学（希望ta没有挂的很早😂）， 我们可以根据每个一个`TileView`距离中心图层的位置来获取一个标准化的矢量。

在` distanceFromCenterViewWithView(_:):`附近，添加一个新的函数：

```swift
private func normalizedVectorFromCenterViewToView(view: UIView)->CGPoint {
  let length = self.distanceFromCenterViewWithView(view)
  guard let centerTileView = centerTileView where length != 0 else { return CGPointZero }
 
  let deltaX = view.center.x - centerTileView.center.x
  let deltaY = view.center.y - centerTileView.center.y
  return CGPoint(x: deltaX / length, y: deltaY / length)
}
```
然后回到`startAnimatingWithBeginTime(_:)`，修改之前的代码为：

```swift
private func startAnimatingWithBeginTime(beginTime: NSTimeInterval) {
  for tileRows in tileViewRows {
    for view in tileRows {
 
      let distance = self.distanceFromCenterViewWithView(view)
      var vector = self.normalizedVectorFromCenterViewToView(view)
 
      vector = CGPoint(x: vector.x * kRippleMagnitudeMultiplier * distance, y: vector.y * kRippleMagnitudeMultiplier * distance)
 
      view.startAnimatingWithDuration(kAnimationDuration, beginTime: beginTime, rippleDelay: kRippleDelayMultiplier * NSTimeInterval(distance), rippleOffset: vector)
    }
  }
}
```
这段代码计算每个子图层所需要的偏差矢量，然后带入到动画调用中。

运行查看一下：

![](/img/posts/UberSplash/Grid-3.gif)

酷炫！？最后一步，是让用户有一种代入感！我们可以在动画开始之前做一个拉伸的效果！

找到`startAnimatingWithBeginTime(_:)`方法， 添加下面的代码：

```swift
 let linearTimingFunction = CAMediaTimingFunction(name: kCAMediaTimingFunctionLinear)
 
  let keyframe = CAKeyframeAnimation(keyPath: "transform.scale")
  keyframe.timingFunctions = [linearTimingFunction, CAMediaTimingFunction(controlPoints: 0.6, 0.0, 0.15, 1.0), linearTimingFunction]
  keyframe.repeatCount = Float.infinity;
  keyframe.duration = kAnimationDuration
  keyframe.removedOnCompletion = false
  keyframe.keyTimes = [0.0, 0.45, 0.887, 1.0]
  keyframe.values = [0.75, 0.75, 1.0, 1.0]
  keyframe.beginTime = beginTime
  keyframe.timeOffset = kAnimationTimeOffset
 
  containerView.layer.addAnimation(keyframe, forKey: "scale")
```
运行：

![](/img/posts/UberSplash/FuberFinal.gif)

有没有很有感觉！你已经实现了一个激动人心的，专业级别的动画。

> 你可以去尝试改变`kRippleMagnitudeMultiplier `与`kRippleDelayMultiplier`的值，看看会带来什么样的奇妙化学反应。

最后，回到`RootContainerViewController.swift.`的`viewDidLoad() `方法。把我们之前的`showSplashViewControllerNoPing()`调用改为`showSplashViewController()`。

再次运行：

![](/img/posts/UberSplash/Fuber-Animation.gif)

一个酷炫的开屏动画就这样被创建了出来。有没有感到热血沸腾呢！

## 其他
你可以在这里[下载完整项目]()

如果你想学到更多动画的`姿势`！请[戳这里](https://www.raywenderlich.com/store/ios-animations-by-tutorials)

`Have Fun!`
