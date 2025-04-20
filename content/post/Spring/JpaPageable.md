---
title: "JpaPageable"
author: Bill.Lin
date: 2020-01-07T13:26:41+08:00
draft: false
tags: []
Description: ""
Categories: ["Spring", "JPA"]
DisableComments: false
---

### Specification


- CriteriaQuery介面：
> 代表一個specific的頂層查詢物件，它包含著查詢的各個部分，比如：select 、from、where、group by、order by等注意：CriteriaQuery物件只對實體型別或嵌入式型別的Criteria查詢起作用。

- Root:
> 代表Criteria查詢的根物件，Criteria查詢的查詢根定義了實體型別，能為將來導航獲得想要的結果，它與SQL查詢中的FROM子句類似。
Root範例是型別化的，且定義了查詢的FROM子句中能夠出現的型別。root代表查詢的實體類,query可以從中得到root物件,告訴jpa查詢哪一個實體類,還可以新增查詢條件,還可以結合EntityManager物件 得到最終查詢的 TypedQuery物件。

- CriteriaBuilder介面：
> 用來構建CritiaQuery的構建器物件Predicate：一個簡單或複雜的謂詞型別，其實就相當於條件或者是條件組合。 可通過 EntityManager.getCriteriaBuilder 而得。


```java

    var spec = Specification.<User>where(null);
    if (!user.getAccount().isEmpty()) {
        spec.and((r, q, cb) -> cb.like(r.get("account"), "" + user.getAccount() + "%"));
    }

```


### Page

```java

    private Specification<User> getSpecificationByAccountAndPwd(String account, String pwd) {
        return (Specification<User>) (root, criteriaQuery, criteriaBuilder) -> {
            // 獲取比較的屬性
            Path<Object> compareAccount = root.get("account");
            Path<Object> comparePwd = root.get("password");

            Predicate predicate1 = criteriaBuilder.equal(compareAccount, account);
            Predicate predicate2 = criteriaBuilder.equal(comparePwd, pwd);

            // === and ===
            // criteriaBuilder.and(predicate01, predicate02)
            // === or ===
            // criteriaBuilder.or(predicate01, predicate02)
            return criteriaBuilder.and(predicate1, predicate2);
        };
    }

    private Specification<User> getSpecificationByAccountLike() {
        return (Specification<User>) (root, criteriaQuery, criteriaBuilder) -> {
            // 獲取比較的屬性
            Path<Object> compareAccount = root.get("account");
            // 模糊要求指定引數型別
            return criteriaBuilder.like(compareAccount.as(String.class), "%test%");
        };
    }


    Pageable pageable = PageRequest.of(pageNum, rowCnt, Sort.Direction.DESC, "id");
    Pageable pageable = PageRequest.of(pageNum, rowCnt);
    Page<User> pageResult = userDao.findAll(getSpecificationByAccountLike(), pageable);
    // 全部頁數
    System.out.println("getTotalPages(): " + pageResult.getTotalPages());
    // 全部筆數
    System.out.println("getTotalElements(): " + pageResult.getTotalElements());
    // 每頁筆數
    System.out.println("getSize(): " + pageResult.getSize());
    // 目前頁號，0為第一頁
    System.out.println("getNumber(): " + pageResult.getNumber());
    // 目前頁筆數
    System.out.println("getNumberOfElements(): " + pageResult.getNumberOfElements());
    //result
    System.out.println("getContent(): " + pageResult.getContent());

```


#### 小試身手1


```java

  /**
   * *
   * @param 第幾頁
   * @param 每頁數量有幾個
   */ 
    public List<BigInteger> getOrderInfo(@PathVariable("page") int page, @PathVariable("size") int size){

        var custInfo = "bill";

        Pageable pageable = PageRequest.of(page, size, Sort.Direction.DESC, "order_id");
        Page<OrderMaster> pageOrders = orderMasterRepository.findAll(getSpecialField(custInfo), pageable);

        log.info("pageOrders: {}", pageOrders);
        System.out.println("total counts: " + pageOrders.getTotalElements());
        System.out.println("total page: " + pageOrders.getTotalPages());
        return pageOrders.getContent().stream().map(OrderMaster::getOrderId).collect(Collectors.toList());
    }


  //   Predicate toPredicate(Root<T> root, CriteriaQuery<?> query, CriteriaBuilder cb);
  private Specification<OrderMaster> getSpecialField(String custInfo) {
    return (root, criteriaQuery, criteriaBuilder) -> {
      //      Path<Object> comparePwd = root.get("custInfo");
      //      Predicate predicate = criteriaBuilder.equal(comparePwd, custInfo);
      //      return criteriaBuilder.and(predicate);
      return criteriaBuilder.equal(root.get("custInfo"), custInfo);
    };

```

#### 小試身手2

```java

  /**
   * *
   * @param 第幾頁
   * @param 每頁數量有幾個
   */ 
   public List<BigInteger> getOrderInfo(@PathVariable("page") int page, @PathVariable("size") int size) {

    var custInfo = "bill";

    Pageable pageable = PageRequest.of(page, size, Sort.Direction.DESC, "order_id");

    Page<OrderMaster> pageOrders = orderMasterRepository.findAll((root, criteriaQuery, criteriaBuilder) -> {
      Path<Object> comparePwd = root.get("custInfo");
      Predicate predicate = criteriaBuilder.equal(comparePwd, erpCustNo);
      return criteriaBuilder.and(predicate);
    }, pageable);
    log.info("pageOrders: {}", pageOrders);
    System.out.println("total counts: " + pageOrders.getTotalElements());
    System.out.println("total page: " + pageOrders.getTotalPages());
    return pageOrders.getContent().stream().map(OrderMaster::getOrderId).collect(Collectors.toList());
  }

```


#### 小試身手3


```java

  /**
   * *
   * @param 第幾頁
   * @param 每頁數量有幾個
   */ 
   public List<BigInteger> getOrderInfo(@PathVariable("page") int page, @PathVariable("size") int size) {

    var custInfo = "bill";

    Pageable pageable = PageRequest.of(page, size, Sort.Direction.DESC, "order_id");
    Specification<OrderMaster> specification = new Specification<OrderMaster>() {
      @Override
      public Predicate toPredicate(Root<OrderMaster> root, CriteriaQuery<?> query, CriteriaBuilder criteriaBuilder) {
        return criteriaBuilder.equal(root.get("custInfo"), erpCustNo);
      }
    };

    Page<OrderMaster> pageOrders = orderMasterRepository.findAll(specification, pageable); 
    log.info("pageOrders: {}", pageOrders);
    System.out.println("total counts: " + pageOrders.getTotalElements());
    System.out.println("total page: " + pageOrders.getTotalPages());
    return pageOrders.getContent().stream().map(OrderMaster::getOrderId).collect(Collectors.toList());
  }

```