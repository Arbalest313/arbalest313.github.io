---
layout:     post
title:      "如何运用HealthKit的睡眠分析"
subtitle:   "Swift"
date:       2016-07-10
author:     "yuan"
header-img: "img/post-bg-js-version.jpg"
tags:
    - Swift
    - iOS
    - HealthKit
    - 翻译
---

##如何运用HealthKit的睡眠分析 Swift
>作者：[ANUSHK MITTAL](http://www.appcoda.com/author/anushkmittal/) 
>06/18/2016
>[原文](http://www.appcoda.com/sleep-analysis-healthkit/)
>
>翻译于7/10/2016, live with less share with more, [黄源](http://hyyy.me)

今天，睡眠革命正在掀起一道旋风。 人们从没像今天这样关心他们睡眠的时间与睡眠的数据，并以数据作为自己睡眠状态的趋势标识。而这种分析通过硬件与软件的发展已经达到了一个新的高度。

Apple通过新的科技来获取用户个人的健康信息，并且安全的的储存在了内置的Health App里面。 开发者不仅可以通过HealthKit来搭建健康类的App，开发者还可以获取关于用户的睡眠分析数据。

这篇文章将带你快速进入与了解HealthKit，并且将展示你如何搭建一个简单的App来分析用户的睡眠数据。

#简介
如果你想创建一个与健康数据有关的iPhone App或者Watch App，HealthKit将会是你的得力助手。HealthKit的设计之初就是为了管理大量不同的数据。它整合来自不同数据源的数据，根据用户不同的行为表现。开发者同样可以获取独立单个数据源的数据，然后再自己管理整合数据。这些数据不仅仅可以用在身体，健康，营养等检测上，还可以用在睡眠质量的检测上。

在接下来的文章中，我将会展示如何使用HealthKit框架来保存与获取睡眠分析数据在iOS里。同样这些方也可以被运用在watchOS里。
>请注意，以下分享是建立在Swfit 2.0与Xcode7.0以上的

在开始之前，请下载已经建立好的[初始项目](https://github.com/appcoda/SleepAnalysis/blob/master/SleepAnalysisStarter.zip?raw=true). 我已经为你创建好了用户界面和一些基础的函数。 当你运行初始项目时，请按下Start按钮，你会看见一个UI计时器用来展示时间的变化。

#运用HealthKit
我们的目标是在用户点击 Start与 Stop 按钮时，分析与存储用户的睡眠分析数据。在开始使用HealthKit之前， 你必须在App Bundle里面申明你需要使用HealthKit。 在你的项目里面，找到target->Capabilities->HealthKit,设置为ON。

![](http://www.appcoda.com/wp-content/uploads/2016/05/HealthKit-allow-1024x640.png)

接着你需要在`ViewController`里创建一个`HKHealthStore`的实例：
	
```swift
let healthStore = HKHealthStore()
```

我们将会使用这个实例来获取HealthKit的信息。

之前提到HealthKit会获取用户的健康信息。在获取、写入用户的睡眠分析信息之前，开发者必须先向用户申请相对应的权限。这里我们可以使用HealthKit内置的方法实现。 更新`viewDidLoad`的内容:

```swift
override func viewDidLoad() {
    super.viewDidLoad()
    
    let typestoRead = Set([
        HKObjectType.categoryTypeForIdentifier(HKCategoryTypeIdentifierSleepAnalysis)!
        ])
    
    let typestoShare = Set([
        HKObjectType.categoryTypeForIdentifier(HKCategoryTypeIdentifierSleepAnalysis)!
        ])
    
    self.healthStore.requestAuthorizationToShareTypes(typestoShare, readTypes: typestoRead) { (success, error) -> Void in
        if success == false {
            NSLog(" Display not allowed")
        }
    }
}
```

这些代码将询问用户是否给予相关的权限。在回掉中，你可以得到成功与失败的信息并且做出相应的对策。实践中，用户并不一定会给你的App全部所需要的权限，你需要小心处理相对应的失败回掉信息。

在这里为了测试App，你需要点击Allow选项来获取App的权限，从而获取设备里的健康信息数据。

![](http://www.appcoda.com/wp-content/uploads/2016/05/Health-App-Permission.png)

#写入分析数据
首先，我们思考的是如何获取到睡眠分析数据？ 根据苹果的官方文档， 每一个睡眠分析样品类只能有一个值。 为了标识用户躺在床上与睡眠的状态，HealthKit会使用在两个或者多个拥有重叠时间的样品类(sample)。 根据比较这些样品类的开始与结束时间，开发者就能计算出更具价值的数据：

* 用户需要进入睡眠的时间
* 用户实际进入睡眠的百分比
* 用户晚上醒来的次数
* 用户躺在床上的时间与睡眠时间的总和

![](http://www.appcoda.com/wp-content/uploads/2016/05/record_sleep_data.png)

简单来说， 你需要按下面的方法来存储睡眠分析数据到HealthKitStore里面：

1. 我们需要定义两个`NSDate`实例分别对应开始与结束时间。
2. 使用`HKCategoryTypeIdentifierSleepAnalysis`标识来创建`HKObjectType`实例
3. 创建一个新的`HKCategorySample`类，通常你需要使用多个样品类来记录睡眠数据。每一个单独的样品类标识一个时间段。因此我们可能会创建躺在床上的样品类与在睡眠状态的样品，并且它们也许会拥有相互重叠的时间。
4. 最后，我们使用`HKHealthStore`的`saveObject`方法来保存数据

>提示：对于样品类的类别，你可以查看[ HealthKit Constants Reference.](https://developer.apple.com/library/ios/documentation/HealthKit/Reference/HealthKit_Constants/index.html#//apple_ref/doc/uid/TP40014710)

现在把上面的步奏转化成Swift代码，下面是同时保存躺在床上的与睡眠状态的睡眠分析数据的相关代码。在`ViewController`里面添加这个函数

```swift
func saveSleepAnalysis() {
    
    // alarmTime and endTime are NSDate objects
    if let sleepType = HKObjectType.categoryTypeForIdentifier(HKCategoryTypeIdentifierSleepAnalysis) {
        
        // we create our new object we want to push in Health app
        let object = HKCategorySample(type:sleepType, value: HKCategoryValueSleepAnalysis.InBed.rawValue, startDate: self.alarmTime, endDate: self.endTime)
        
        // at the end, we save it
        healthStore.saveObject(object, withCompletion: { (success, error) -> Void in
            
            if error != nil {
                // something happened
                return
            }
            
            if success {
                print("My new data was saved in HealthKit")
                
            } else {
                // something happened again
            }
            
        })
        
        
        let object2 = HKCategorySample(type:sleepType, value: HKCategoryValueSleepAnalysis.Asleep.rawValue, startDate: self.alarmTime, endDate: self.endTime)
        
        healthStore.saveObject(object2, withCompletion: { (success, error) -> Void in
            if error != nil {
                // something happened
                return
            }
            
            if success {
                print("My new data (2) was saved in HealthKit")
            } else {
                // something happened again
            }
            
        })
        
    }
    
}
```

当我们需要保存睡眠数据时，我们可以调用这个方法。

#读取分析数据
为了获取睡眠分析数据，我们需要先创建查询语句。首先你要使用`HKCategoryTypeIdentifierSleepAnalysis`标识来获取到相对应的`HKObjectType`类。然后你可以使用`startDate`与`endDate`来获取对应时间段内的数据。同事你还需要创建`sortDescriptor`来排序将会得到的对应查询结果。

你的获取睡眠数据的代码也许会是这样的：

```swift
func retrieveSleepAnalysis() {
    
    // first, we define the object type we want
    if let sleepType = HKObjectType.categoryTypeForIdentifier(HKCategoryTypeIdentifierSleepAnalysis) {
        
        // Use a sortDescriptor to get the recent data first
        let sortDescriptor = NSSortDescriptor(key: HKSampleSortIdentifierEndDate, ascending: false)
        
        // we create our query with a block completion to execute
        let query = HKSampleQuery(sampleType: sleepType, predicate: nil, limit: 30, sortDescriptors: [sortDescriptor]) { (query, tmpResult, error) -> Void in
            
            if error != nil {
                
                // something happened
                return
                
            }
            
            if let result = tmpResult {
                
                // do something with my data
                for item in result {
                    if let sample = item as? HKCategorySample {
                        let value = (sample.value == HKCategoryValueSleepAnalysis.InBed.rawValue) ? "InBed" : "Asleep"
                        print("Healthkit sleep: \(sample.startDate) \(sample.endDate) - value: \(value)")
                    }
                }
            }
        }
        
        // finally, we execute our query
        healthStore.executeQuery(query)
    }
}
```

这段代码借助询问HealthKit来获取所有睡眠分析数据，并且以降序的形式排序。接着打印出每一个查询结果的开始时间，结束时间与相应的样品类型（躺在床上或睡眠状态）。同时我还设置了只展示30个查询结果的限制。你可以使用`predicate`函数来设置你想要的开始与结束时间。

#测试
对于这个项目， 我使用`NSTimer`来显示我们按下Start按钮之后的时间。`NSDate`会被创建当我们点击Start与Stop按钮的时候，并用来标识时间段。在`stop`函数里，你可以调用`saveSleepAnalysis()`与`retrieveSleepAnalysis()`来获取与存储睡眠数据。

```swfit
@IBAction func stop(sender: AnyObject) {
    endTime = NSDate()
    saveSleepAnalysis()
    retrieveSleepAnalysis()
    timer.invalidate()
}
```
在你的App里面，你也许会将`NSDate`改成其他类或者事件来标识你的开始与结束时间，并存储相应的睡眠数据。

一旦你做出了你自己的选择，你就可以运行你的app开始你的时间记录。让你的app运行几分钟然后再停止。在这之后打开Health app，你将会在里面看到你App写入的睡眠分析数据。
![](http://www.appcoda.com/wp-content/uploads/2016/06/sleep-analysis-test-1024x725.png)
![](http://www.appcoda.com/wp-content/uploads/2016/06/sleep-analysis-test-1240x878.png)

#一些建议
HealthKit是被设计来给开发者提供一个高效的平台，它让开发者简单的分享与获取用户数据并且排除任何可能的重复与不可靠的数据。苹果的审核非常明确的标识，使用HealthKit但不给任何明确提示的App将会被拒绝发布。

任何写入虚假或者不正确数据的健康类型的App将会被拒绝。这代表着， 你不能像这篇文章一样很粗略或者简单的计算你的睡眠数据。你应该使用内置的感应数据来读取或者操作任何参数来避免任何计算失误。

完整的Xcode项目，你可以在[这里](https://github.com/appcoda/SleepAnalysis)找到




