
// cc at 2015-4-14
'use strict'

// 第三个参数设置为 undefined，因为有些浏览器没有 undefined
(function(window, angular, undefined){

// 基于jqm 的触摸事件，swipe（滑动屏幕）
// <div doc-module-components="ngTouch"></div>

// 定义 ngTouch module
var ngTouch = angular.module('ngTouch', [])

ngTouch.factory('$swipe', [function(){
	// 通过在任何方向的总的滑动距离来判断是 swipe 事件还是 scroll事件
	var MOVE_BUFFER_RADIUS = 10
	
	// 获取坐标，coordinates(坐标)
	function getCoordinates(event){
		var touches = event.touches && event.touches.length ? event.touches : [event],
			e = (event.changedTouches && event.changedTouches[0]) ||
				(event.originalEvent && event.originalEvent.changedTouches &&
					event.originalEvent.changedTouches[0]) ||
				touches[0].originalEvent || touches[0]

		return {
			x: e.clientX,
			y: e.clientY
		}
	}

	return {
		bind: function(element, eventHandlers){
			// 总的移动距离，用来控制 swipe 对比 scroll
			var totalX, totalY, startCoords, lastPos,
				active = false // 设置是否为 swipe 事件

			element.on('touchstart mousedown', function(event){
				startCoords = getCoordinates(event)
				active = true
				totalX = 0
				totalY = 0
				lastPos = startCoords
				eventHandlers['start'] && eventHandlers['start'](startCoords, event)
			})

			element.on('touchcancel', function(event){
				active = false
				eventHandlers['cancel'] && eventHandlers['cancel'](event)
			})

			element.on('touchmove mousemove', function(event){
				if(!active) return 	
				
				/* 
				安卓系统如果判断我们开始 scroll了的话，会发送一个 touchcancel 的事件
				通过移动的总距离是否大于 10px 来判断是不是开始 scroll 了
				如果 totalX > totalY 则发送 preventDefault() 来阻止 touchcanel事件的发送，把它当做swipe 事件来处理，
				如果 totalX < totalY 则让浏览器按 scroll 事件来处理
				这个就是 安卓在 左右上下滑动出现误差时的判断，判断触摸方式为左右移动，还是上下移动
				因为手指在滑动的时候不可能做到直线滑动
				*/
				if(!startCoords) return 
				
				var coords = getCoordinates(event)
					
				// Math.abs() 取绝对值
				totalX += Math.abs(coords.x - lastPos.x)
				totalY += Math.abs(coords.y - lastPos.y)
				lastPos = coords

				if(totalX < MOVE_BUFFER_RADIUS && totalY < MOVE_BUFFER_RADIUS){
					return 
				}

				// 当 totalX 或 totalY 有一个超过了缓冲（即 10px）,来决定这个是左右滑动还是上下滑动
				if(totalY > totalX){
					// 让原生的 scrolling事件来处理
					active = false
					eventHandlers['cancel'] && eventHandlers['cancel'](event)
					return 
				}else{
					// 防止浏览器认为是scorlling事件
					event.preventDefault()
					eventHandlers['move'] && eventHandlers['move'](coords, event)
				}
			})
			
			// jquery里面的多个事件绑定一个函数
			element.on('touched mouseup', function(event){
				if(!active) return 

				active = false
				eventHandlers['end'] && eventHandlers['end'](getCoordinates(event), event)
			})
		}
	}
}])

/*
ng-click
更强力的click事件 来替代触摸设备默认的事件，因为大多数触摸设备都会在 tap-and-release之后的300ms才发送触摸事件，这里的这个版本会立刻发送，
需要 include angular.touch.js

这里的 css 设置了 ng-click-active样式，在pc上也会出现，所以有必要的话可以做修改

举例如下
<example module="ngClickExample" deps="angular-touch.js">
	<file name="index.html">
		<button ng-click="count = count + 1" ng-init="count = 0">Increment</button>
		count: {{ count }}
	</file>
	<file name="script.js">
		angular.module('ngClickExample', ['ngTouch'])
	</file>
</example>
*/

ngTouch.config(['$provide', function($provide){
	$provide.decorator('ngClickDirective', ['$delegate', function($delegate){
		// 终止默认的 ngClick 指令
		$delegate.shift()
		
		return $delegate
	}])
}])

ngTouch.directive('ngClick', ['$parse', '$timeout', '$rootElement', 
	function($parse, $timout, $rootElement){
		// duration(持续事件)	
		var TAP_DURATION = 750, // 比 750ms 短就是 tap 事件，比 750ms长就是 taphold或 drag事件
			MOVE_TOLERANCE = 12, // 12px是在移动设备里用的最多的，移动距离差 tolerance(公差)
			PREVENT_DURATION = 2500, 
			// 2.5秒是最大的 preventGhostClick call to click， ghost clicks事件 网页误点击事件
			CLICKBUSTER_THRESHOLD = 25, // 25px 在任何维度是 busting（中断，限制）触摸时间的阀值
			ACTIVE_CLASS_NAME = 'ng-click-active',
			lastPreventedTime,
			touchCoordinates,
			lastLabelClickCoordinates
		
		// 检测区域内的坐标是否足够接近, region(范围)
		function hit(x1, y1, x2, y2){
			return Math.abs(x1 - x2) < CLICKBUSTER_THRESHOLD && 
				Math.abs(y1 - y2) < CLICKBUSTER_THRESHOLD
		}

		
	}])

// 用来求出 swipe水平滑动的指令,三个参数分别为 指令名，方向，事件名
function makeSwipeDirective(directiveName, direction, eventName){
	ngTouch.directive(directiveName, ['$parse', '$swipe', function($parse, $swipe){
		// 最大的垂直三角应该小于 75px才能出发 swipe事件（水平滑动事件），即如果你的手指滑动距离在垂直方向超过了75px,系统会判断你是想要上下滑动（scroll）页面
		var MAX_VERTICAL_DISTANCE = 75, 
			MAX_VERTICAL_RATIO = 0.3, // 垂直滑动距离不应该超过水平滑动距离的最大比例
			MAX_HORIZONTAL_DISTANCE = 30 // 如果是横向的滑动，至少滑动30px

		return function(scope, element, attr){
			var swipeHandler = $parse(attr[directiveName]),
				startCoords, valid
			
			// 通过Ｘ，Ｙ坐标的偏移量来验证是否为$swipe事件
			function validSwipe(coords){
				if(!startCoords){
					return false
				}

				var deltaY = Math.abs(coords.y - startCoords.y),
					deltaX = (coords.x - startCoords.x) * direction

				return valid && 
					deltaY < MAX_VERTICAL_DISTANCE &&
					deltaX > 0 &&
					deltaX > MIN_HORIZONTAL_DISTANCE &&
					deltaY / deltaX < MAX_VERTICAL_RATIO
			}

			$swipe.bind(element, {
				'start': function(coords, event){
					startCoords = coords
					valid = true
				},

				'cancel': function(event){
					valid = false
				},

				'end': function(coords, event){
					if(validSwipe(coords)){
						scope.$apply(function(){
							element.triggerHandler(eventName)
							swipeHandler(scope, {$event: event})
						})
					}
				}
			})
		}
	}])
}

// left is negative X-coordinate, right is positive
// 往左是 x左右的负数，右为正数
makeSwipeDirective('ngSwipeLeft', -1, 'swipeleft')
makeSwipeDirective('ngSwipeRight', 1, 'swiperight')

})(window, window.angular)
