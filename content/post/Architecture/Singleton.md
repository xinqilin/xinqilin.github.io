---
title: "DesignPattern - Basic - Singleton"
author: Bill.Lin
date: 2018-08-06T23:05:44+08:00
draft: false
tags: []
Description: ""
Categories: ["Architecture"]
DisableComments: false
---

# Singleton

確保在 java 虛擬機中只存在該類的一個實例。單例類必須提供一個全局訪問點來獲取類的實例。
 - 一個類應該只允許一個實例，
 - 應該允許全局訪問該單個實例。
 - 用於限制從其他類實例化類的私有構造函數。
 - 同一類的私有靜態變量，是該類的唯一實例。
 - 公共靜態方法，返回類的實例，這是外部世界獲取單例類實例的全局訪問點。

 ### Reflection, Clone, 序列化/反序列化 違反 Singleton

 ```java

	public static Singleton instance= new Singleton();
	
	private Singleton() {
		System.out.println("creating instance.....");
	}
	
	public static Singleton getInstance() {
		return instance;
	}



	public static void main(String[] args) throws Exception{
		SingletonS s1 = SingletonS.getInstance();
		SingletonS s2 = SingletonS.getInstance();
		System.out.println("Hashcode of Object s1: " +s1.hashCode());
		System.out.println("Hashcode of Object s2: " +s2.hashCode());


        // Reflection
        Class clazz = Class.forName("com.dev.dp.creational.singleton.SingletonR");
		Constructor<SingletonR> ctr= clazz.getDeclaredConstructor();
		ctr.setAccessible(true);
		SingletonR s3 = ctr.newInstance();
		System.out.println("Hashcode of Object s3: " +s3.hashCode());
		
        // Clone
        Singleton s3 = (Singleton)s2.clone();
		System.out.println("Hashcode of Object s3: " +s3.hashCode());

        // Serialization / Deserialization
		ObjectOutputStream oos = new ObjectOutputStream(new FileOutputStream("D:/tmp/s2.ser"));
		oos.writeObject(s2);
		
		ObjectInputStream ois = new ObjectInputStream(new FileInputStream("D:/tmp/s2.ser"));
		SingletonS s3= (SingletonS)ois.readObject();
		
		System.out.println("Hashcode of Object s3: " +s3.hashCode());

 ```

### 修復

```java

    if(instance != null){
        throw new RuntimeException("無法創造新 instance");
    }
    return Singleton.getInstance();

```


### 多執行緒 eager / lazy init

```java

    // 可加 volatile 關鍵字 , write the main memory, 可減少開銷
	private static SingletonT instance=null; //lazy initialization
	
	private SingletonT(){
		System.out.println("Creating...");
	}
	
    // double check lock
	public static SingletonT getInstance(){
		if (instance == null) {   //check1
			synchronized (SingletonT.class) {
				if (instance == null) {   //check2
					instance = new SingletonT();
				}
			}
		}
		return instance;
	}
	
	static void useSingleton(){
		SingletonT singleton = SingletonT.getInstance();
		System.out.println("Hashcode of Singleton Object: "+singleton.hashCode());
	}
	
	public static void main(String[] args) throws Exception {
		ExecutorService service = Executors.newFixedThreadPool(2);
		service.submit(SingletonT::useSingleton);
		service.submit(SingletonT::useSingleton);
		service.shutdown();
	}	
}

```

### Singleton 目的

一次只能有一個實例（對象）的類是單例類。如果我們第二次嘗試實例化 Singleton 類，新變量也指向之前創建的實例。因此，無論我們通過任何實例對類內的任何變量進行任何修改，都會影響創建的單個實例的變量。例如，Runtime 類、Action Servlet、Service Locator 是一些 Singleton 類。私有構造函數和工廠方法也屬於單例類的例子。

創建 Singleton 類的主要目的是限制創建對象的數量。此外，通過使用 Singleton 類，每次發出新請求時都不會創建對象。相反，將重複使用單個對象。這就是 Java 中的 Singleton 模式主要用於多線程和數據庫應用程序的原因。例如，我們在創建數據庫連接時使用了單例類的概念。在這種情況下，我們通過不創建多個數據庫連接來限制內存浪費。

### Note

 - 用private關鍵字聲明Singleton類的構造函數。通過將構造函數設為私有，沒有其他類可以從它實例化或生成對象。如果類中有多個構造函數，請將它們全部設為私有。
 - 同一類的私有靜態變量，它是該類的唯一實例。
 - 聲明一個返回類型為這個單例類的對象的靜態方法。

