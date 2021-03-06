/**
 * @license
 * Copyright color-coding studio. All Rights Reserved.
 *
 * Use of this source code is governed by an Apache License, Version 2.0
 * that can be found in the LICENSE file at http://www.apache.org/licenses/LICENSE-2.0
 */

import * as ibas from "ibas/index";
import * as bo from "../../borep/bo/index";
import { BORepositoryMaterials } from "../../borep/BORepositories";

/** 编辑应用-仓库日记账 */
export class MaterialInventoryJournalEditApp
            extends ibas.BOEditApplication<IMaterialInventoryJournalEditView
                                            ,bo.MaterialInventoryJournal> {

    /** 应用标识 */
    static APPLICATION_ID: string = "2687f600-932e-484e-9cab-c5e4bfc2758d";
    /** 应用名称 */
    static APPLICATION_NAME: string = "materials_app_materialjournal_edit";
    /** 业务对象编码 */
    static BUSINESS_OBJECT_CODE: string = bo.MaterialInventoryJournal.BUSINESS_OBJECT_CODE;
    /** 构造函数 */
    constructor() {
        super();
        this.id = MaterialInventoryJournalEditApp.APPLICATION_ID;
        this.name = MaterialInventoryJournalEditApp.APPLICATION_NAME;
        this.boCode = MaterialInventoryJournalEditApp.BUSINESS_OBJECT_CODE;
        this.description = ibas.i18n.prop(this.name);
    }
    /** 注册视图 */
    protected registerView(): void {
        super.registerView();
        // 其他事件
        this.view.deleteDataEvent = this.deleteData;
        this.view.createDataEvent = this.createData;
        this.view.chooseMaterialJournalWarehouseEvent = this.chooseMaterialJournalWarehouse;
        this.view.chooseMaterialJournalItemCodeEvent = this.chooseMaterialJournalItemCode;
    }
    /** 视图显示后 */
    protected viewShowed(): void {
        // 视图加载完成
        if (ibas.objects.isNull(this.editData)) {
            // 创建编辑对象实例
            this.editData = new bo.MaterialInventoryJournal();
            this.proceeding(ibas.emMessageType.WARNING, ibas.i18n.prop("shell_data_created_new"));
        }
        this.view.showMaterialJournal(this.editData);
    }
    /** 运行,覆盖原方法 */
    run(...args: any[]): void {
        let that: this = this;
        if (ibas.objects.instanceOf(arguments[0], bo.MaterialInventoryJournal)) {
            // 尝试重新查询编辑对象
            let criteria: ibas.ICriteria = arguments[0].criteria();
            if (!ibas.objects.isNull(criteria) && criteria.conditions.length > 0) {
                // 有效的查询对象查询
                let boRepository: BORepositoryMaterials = new BORepositoryMaterials();
                boRepository.fetchMaterialInventoryJournal({
                    criteria: criteria,
                    onCompleted(opRslt: ibas.IOperationResult<bo.MaterialInventoryJournal>): void {
                        let data: bo.MaterialInventoryJournal;
                        if (opRslt.resultCode === 0) {
                            data = opRslt.resultObjects.firstOrDefault();
                        }
                        if (ibas.objects.instanceOf(data, bo.MaterialInventoryJournal)) {
                            // 查询到了有效数据
                            that.editData = data;
                            that.show();
                        } else {
                            // 数据重新检索无效
                            that.messages({
                                type: ibas.emMessageType.WARNING,
                                message: ibas.i18n.prop("shell_data_deleted_and_created"),
                                onCompleted(): void {
                                    that.show();
                                }
                            });
                        }
                    }
                });
                // 开始查询数据
                return;
            }
        }
        super.run();
    }
    /** 待编辑的数据 */
    protected editData: bo.MaterialInventoryJournal;
    /** 保存数据 */
    protected saveData(): void {
        let that: this = this;
        let boRepository: BORepositoryMaterials = new BORepositoryMaterials();
        boRepository.saveMaterialInventoryJournal({
            beSaved: this.editData,
            onCompleted(opRslt: ibas.IOperationResult<bo.MaterialInventoryJournal>): void {
                try {
                    that.busy(false);
                    if (opRslt.resultCode !== 0) {
                        throw new Error(opRslt.message);
                    }
                    if (opRslt.resultObjects.length === 0) {
                        // 删除成功，释放当前对象
                        that.messages(ibas.emMessageType.SUCCESS,
                            ibas.i18n.prop("shell_data_delete") + ibas.i18n.prop("shell_sucessful"));
                        that.editData = undefined;
                    } else {
                        // 替换编辑对象
                        that.editData = opRslt.resultObjects.firstOrDefault();
                        that.messages(ibas.emMessageType.SUCCESS,
                            ibas.i18n.prop("shell_data_save") + ibas.i18n.prop("shell_sucessful"));
                    }
                    // 刷新当前视图
                    that.viewShowed();
                } catch (error) {
                    that.messages(error);
                }
            }
        });
        this.busy(true);
        this.proceeding(ibas.emMessageType.INFORMATION, ibas.i18n.prop("shell_saving_data"));
    }
    /** 删除数据 */
    protected deleteData(): void {
        let that: this = this;
        this.messages({
            type: ibas.emMessageType.QUESTION,
            title: ibas.i18n.prop(this.name),
            message: ibas.i18n.prop("sys_whether_to_delete"),
            actions: [ibas.emMessageAction.YES, ibas.emMessageAction.NO],
            onCompleted(action: ibas.emMessageAction): void {
                if (action === ibas.emMessageAction.YES) {
                    that.editData.delete();
                    that.saveData();
                }
            }
        });
    }
    /** 新建数据，参数1：是否克隆 */
    protected createData(clone: boolean): void {
        let that: this = this;
        let createData: Function = function (): void {
            if (clone) {
                // 克隆对象
                that.editData = that.editData.clone();
                that.proceeding(ibas.emMessageType.WARNING, ibas.i18n.prop("shell_data_cloned_new"));
                that.viewShowed();
            } else {
                // 新建对象
                that.editData = new bo.MaterialInventoryJournal();
                that.proceeding(ibas.emMessageType.WARNING, ibas.i18n.prop("shell_data_created_new"));
                that.viewShowed();
            }
        };
        if (that.editData.isDirty) {
            this.messages({
                type: ibas.emMessageType.QUESTION,
                title: ibas.i18n.prop(this.name),
                message: ibas.i18n.prop("sys_data_not_saved_whether_to_continue"),
                actions: [ibas.emMessageAction.YES, ibas.emMessageAction.NO],
                onCompleted(action: ibas.emMessageAction): void {
                    if (action === ibas.emMessageAction.YES) {
                        createData();
                    }
                }
            });
        } else {
            createData();
        }
    }

    protected chooseMaterialJournalWarehouse(): void {
        let that: this = this;
        ibas.servicesManager.runChooseService<bo.Warehouse>({
            boCode: bo.Warehouse.BUSINESS_OBJECT_CODE,
            chooseType: ibas.emChooseType.SINGLE,
            criteria: [
                new ibas.Condition(bo.Warehouse.PROPERTY_ACTIVATED_NAME, ibas.emConditionOperation.EQUAL, "Y")
            ],
            onCompleted(selecteds: ibas.List<bo.Warehouse>): void {
                that.editData.warehouse = selecteds.firstOrDefault().code;
            }
        });
    }

    protected chooseMaterialJournalItemCode(): void {
        let that: this = this;
        ibas.servicesManager.runChooseService<bo.Material>({
            boCode: bo.Material.BUSINESS_OBJECT_CODE,
            chooseType: ibas.emChooseType.SINGLE,
            criteria: [
                new ibas.Condition(bo.Warehouse.PROPERTY_ACTIVATED_NAME, ibas.emConditionOperation.EQUAL, "Y")
            ],
            onCompleted(selecteds: ibas.List<bo.Material>): void {
                that.editData.itemCode = selecteds.firstOrDefault().code;
                that.editData.itemName = selecteds.firstOrDefault().name;
            }
        });
    }
}
/** 视图-仓库日记账 */
export interface IMaterialInventoryJournalEditView extends ibas.IBOEditView {
    /** 显示数据 */
    showMaterialJournal(data: bo.MaterialInventoryJournal): void;
    /** 删除数据事件 */
    deleteDataEvent: Function;
    /** 新建数据事件，参数1：是否克隆 */
    createDataEvent: Function;
    /** 选择仓库日记账仓库事件 */
    chooseMaterialJournalWarehouseEvent: Function;
    /** 选择仓库日记账物料编码事件 */
    chooseMaterialJournalItemCodeEvent: Function;
}
