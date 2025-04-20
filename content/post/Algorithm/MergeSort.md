---
title: "MergeSort"
author: Bill.Lin
date: 2021-06-28T19:57:24+08:00
draft: false
tags: ["Java", "Algorithm"]
Description: ""
Categories: ["Java", "Algorithm"]
DisableComments: false
---

# MergeSort

``Time complexity = log n * O(n) = O(n logn)``

MergeSort 套一句柯P 講的話，**小問題解決了，就沒有大問題了**<br>
將 n 個個數的陣列，先左右各切一半，一直切，切到最小單位後，開始拿兩條被切的單位做排序、合併 ! <br>

~~合久必分，分久必合~~ <br>

```java

import java.util.*;

public class MergeSort {

    public static void mergeSort(int[] array) {
        int[] workArray = new int[array.length];
        Sort(array, workArray, 0, array.length - 1);
    }

    private static void Sort(int[] array, int[] workArray, int start, int end) {
        if (start >= end) return;
			
        //避免溢位 start + end 可能超出去
		int mid = start + (end - start)/2;

        Sort(array, workArray, start, mid);
        Sort(array, workArray, mid+1, end);
        Merge(array, workArray, start, mid, mid+1, end);
    }

    private static void Merge(int[] array, int[] workArray, int leftStart, int leftEnd, int rightStart, int rightEnd) {
        int leftPtr = leftStart, rightPtr = rightStart, index = leftStart;
        while (leftPtr <= leftEnd || rightPtr <= rightEnd) {
            if (leftPtr <= leftEnd && rightPtr <= rightEnd) {
				
				//最後一排
                if (array[rightPtr] < array[leftPtr])
                    workArray[index] = array[rightPtr++];
                else
                    workArray[index] = array[leftPtr++];
				
            } else if (leftPtr <= leftEnd){
				// 左邊排序
				workArray[index] = array[leftPtr++];
			}else{
				// 右邊排序
				workArray[index] = array[rightPtr++];
			}   
            ++index;
        }
        for (int i = leftStart; i < index; i++)
            array[i] = workArray[i];
    }

    public static void main(String[] args) {
        int[] data = new int[10];
        for (int i = 0; i < data.length; i++) {
            data[i] = (int) (Math.random() * 100);
        }

        System.out.println("before: " + Arrays.toString(data));
        mergeSort(data);
        System.out.println("after: " + Arrays.toString(data));
    }
}

```

<br>
![MergeSortResult](images/Algorithm/mergeSort/mergeSortResult.png)
<br>
<br>

演算法序列，會用來記錄算法，再用自己或其他人寫的 code 我能吸收的做紀錄，目的是讓自己能多看，然後背起來

