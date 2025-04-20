---
title: "Vue Intro"
author: Bill.Lin
date: 2021-07-04T22:27:03+08:00
draft: false
tags: []
Description: ""
Categories: ["Vue"]
DisableComments: false
---

# 筆記 Vue 未整理 version

### 套件
vetur
vue2 snippets
webpack  -> npm install webpack -g
vue -> npm install -g @vue/cli-init
chrome: vue plugin

### 快速開始

vue init webpack <你的app名字>


``npm run dev``

main.js -> 路由 index.js  在 [router 內]

```js

export default new Router({
    routes:[
        {
            path: '/',
            name: 'HelloWorld',
            component: HelloWorld
        }
    ]
})

```

> HelloWorld.vue 內容 在 [components內]

```html

<template>
    <div>
    
    </div>
</template>

<script>
    export default {
        data(){
            return name: 'Bill'
        }
    }
</script>

<style></style>
```


> 跳頁

```html

<template>
    <div>
        <router-link to="/HelloWorld">go to hello world</router-link>
    </div>
</template>

```

### 單向綁定

```

v-text v-html
v-bind:href="link"   vue instance 內的 method 的 data:{link}
(v-bind:href 可縮寫:href)

```

### 雙向綁定
v-model

### 綁定事件

```

v-on:click="num++"   =   @click

v-on 防止事件冒泡{
`.stop`: 阻止事件冒泡倒父層 
`.prevent`: 阻止默認(預設) 事件發生
`.capture`: 阻止事件捕獲模式
`.self`: 只有自身觸發事件才執行
`.once`: 只執行一次
}

```

### 按鍵修飾符 v-on:keyup.13

```

13 是鍵碼
v-on 按鍵修飾符 懶人包{
`.enter`
`.tab`
`.delete`
`.esc`
`.space`
`.up`
`.down`
`.left`
`.right`
}

```

### v-for

```
v-for = "user in users"  或 v-for="(user, index) in users"
v-for = "(value, key, index) in users"  {{value}} {{key}} {{index}}
 
v-for 增加 :key = ""  可增加效率 最主要是是別惟一值 :key 是 v-bind縮寫

v-if  裡面都填boolean
整個標籤不見
v-show  裡面都填boolean
是用 display:none


常跟 v-if 一起用
v-else-if
v-else 

```

```js

// computed 計算屬性
// watch 監控屬性
// filter 過濾屬性  -> 使用 {{user.gender | genderFilter}}



new Vue({
	el: "#app",
	data:{
		a:100,
		b:200
	},
	computed: {
		total: function(){
			return this.a+this.b
		}
	},
	watch:{
		a: function(newValue, oldValue){
			alert("new: "+newValue+" , old: "+oldValue)
			if(a>3){
				this.msg = "太多"
			}
		}
	},
	filters:{
		genderFilter(val){
			if(val == 1) return "male"
			else return "female"
		}
	}
	
})

```

組件: 

```js

<script>

	Global 組件:
	Vue.component("counter",{
		template: `<button v-on:click = "count++"> {{count}}</button>`
		data(){
			return {
				count: 0
			}
		}
	});
	
	區域組件:
	const buttonCounter = {
		template: `<button v-on:click = "count++"> {{count}}</button>`
		data(){
			return {
				count: 0
			}
		}
	}
	後 放入 vue instance components:{}中
	
	components:{
		'button-counter 名字': buttonCounter
	}
	
	```
	<button-counter></button-counter> 使用
	```
	
</script>

```

### lifeCycle

```js

let app = new Vue(){
    el: app,
    data: {

    },
    beforeCreate: function(){
        
    }
    // 放一些生命週期的東西
};

```