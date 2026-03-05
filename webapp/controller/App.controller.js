sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
  ],
  /**
   * @param {typeof sap.ui.core.mvc.Controller} Controller
   */
  function (Controller, JSONModel, Filter, FilterOperator, MessageToast) {
    "use strict";
    return Controller.extend("zfioriar.controller.App", {
      onInit: function () {
        this._oView = this.getView();
        this.loadCustomerData();
      },
      loadCustomerData: async function _loadCustomerData() {
        const sUrl = "/zbak_inf?ACTION=GET_CUSTOMER_INFO";
        try {
          const response = await fetch(sUrl, {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
          });
          if (!response.ok) throw new Error("网络请求失败");
          const aData = await response.json();

          // 将数据放入 JSONModel
          const oModel = new JSONModel({
            data: aData,
          });
          this._oView.setModel(oModel, "customerModel");
        } catch (error) {
          console.error("加载失败:", error);
        }
      },
      onLiveChange: function _onLiveChange(oEvent) {
        const sValue = oEvent.getParameter("value");
        const oInput = oEvent.getSource();
        const oBinding = oInput.getBinding("suggestionItems");
        if (oBinding) {
          const oFilter = new Filter({
            filters: [
              new Filter("customer_id", FilterOperator.Contains, sValue),
              new Filter("customer_name", FilterOperator.Contains, sValue),
            ],
            and: false,
          });
          oBinding.filter(sValue ? [oFilter] : []);
        }
      },
      loadArData: async function _loadArData(bukrs, group, customer_id) {
        const sUrl = "/zbak_inf?ACTION=GET_CUSTOMER_RECEIVABLE";
        try {
          const response = await fetch(sUrl, {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              bukrs: bukrs,
              group: group,
              customer_id: customer_id,
            }),
          });
          if (!response.ok) throw new Error("网络请求失败");
          const aData = await response.json();
          const aDetails = aData.detail || [];
          // 即使字段缺失也返回空数组，防止报错
          const aProcessedData = this._summaryByGroup(aDetails);
          if (aDetails.length === 0) {
            MessageToast.show(aData.message || "没有查询到数据");
          } else {
            MessageToast.show(aData.message || "查询成功");
          }
          const oModel = this._oView.getModel("ar");
          if (oModel) {
            oModel.setProperty("/data", aProcessedData);
          } else {
            // 第一次运行如果模型不存在则创建
            this._oView.setModel(
              new JSONModel({
                data: aProcessedData,
              }),
              "ar",
            );
          }
        } catch (error) {
          console.error("加载失败:", error);
        }
      },
      onSearch: function _onSearch(oEvent) {
        const bukrs = this._oView.byId("companyCodeInput").getValue();
        const group = this._oView.byId("groupInput").getValue();
        const customer_id = this._oView.byId("customerInput").getValue();
        this.loadArData(bukrs, group, customer_id);
      },
      _summaryByGroup: function _summaryByGroup(aData) {
        const aResult = [];
        const mGroups = new Map();
        //按集团排序
        const aSortedData = aData.sort((a, b) => {
          const sGroupA = a.group || "";
          const sGroupB = b.group || "";
          return sGroupA.localeCompare(sGroupB);
        });
        // 1. 按集团分组 (Group By)
        aSortedData.forEach((item) => {
          const sKey = item.group || "";
          if (!mGroups.has(sKey)) {
            mGroups.set(sKey, []);
          }
          const aGroupItems = mGroups.get(sKey) || [];
          aGroupItems.push(item);
        });

        // 2. 循环每个组，插入明细和小计
        mGroups.forEach((aItems, sGroupName) => {
          let fGroupSubtotal = 0;
          aItems.forEach((item) => {
            const fVal = Number(item.receivable_amount || 0);
            item.receivable_amount = fVal.toFixed(2);
            aResult.push(item);
            fGroupSubtotal += fVal;
          });

          // 3. 插入小计行（增加一个标识位 isSummaryRow）
          aResult.push({
            group: `\u03A3${sGroupName}小计`,
            receivable_amount: fGroupSubtotal.toFixed(2),
            isSummaryRow: true,
          });
        });
        return aResult;
      },
    });
  },
);
