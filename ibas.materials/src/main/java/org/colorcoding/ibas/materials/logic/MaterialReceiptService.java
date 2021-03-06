package org.colorcoding.ibas.materials.logic;

import org.colorcoding.ibas.bobas.common.ConditionOperation;
import org.colorcoding.ibas.bobas.common.ConditionRelationship;
import org.colorcoding.ibas.bobas.common.Criteria;
import org.colorcoding.ibas.bobas.common.ICondition;
import org.colorcoding.ibas.bobas.common.ICriteria;
import org.colorcoding.ibas.bobas.common.IOperationResult;
import org.colorcoding.ibas.bobas.data.Decimal;
import org.colorcoding.ibas.bobas.data.emDirection;
import org.colorcoding.ibas.bobas.data.emYesNo;
import org.colorcoding.ibas.bobas.i18n.I18N;
import org.colorcoding.ibas.bobas.logic.BusinessLogic;
import org.colorcoding.ibas.bobas.logic.BusinessLogicException;
import org.colorcoding.ibas.bobas.mapping.LogicContract;
import org.colorcoding.ibas.materials.bo.material.IMaterial;
import org.colorcoding.ibas.materials.bo.material.Material;
import org.colorcoding.ibas.materials.bo.materialinventory.IMaterialInventoryJournal;
import org.colorcoding.ibas.materials.bo.materialinventory.MaterialInventoryJournal;
import org.colorcoding.ibas.materials.bo.warehouse.IWarehouse;
import org.colorcoding.ibas.materials.bo.warehouse.Warehouse;
import org.colorcoding.ibas.materials.data.emItemType;
import org.colorcoding.ibas.materials.repository.BORepositoryMaterials;

import java.math.BigDecimal;

@LogicContract(IMaterialReceiptContract.class)
/**
 * 物料 - 收货服务 生成一张日记账
 */
public class MaterialReceiptService extends BusinessLogic<IMaterialReceiptContract, IMaterialInventoryJournal> {
    @Override
    protected IMaterialInventoryJournal fetchBeAffected(IMaterialReceiptContract contract) {
        this.checkContractData(contract);
        // region 定义查询条件
        ICriteria criteria = Criteria.create();
        ICondition condition = criteria.getConditions().create();
        condition.setAlias(MaterialInventoryJournal.PROPERTY_BASEDOCUMENTTYPE.getName());
        condition.setValue(contract.getBaseDocumentType());
        condition.setOperation(ConditionOperation.EQUAL);

        condition = criteria.getConditions().create();
        condition.setAlias(MaterialInventoryJournal.PROPERTY_BASEDOCUMENTENTRY.getName());
        condition.setValue(contract.getBaseDocumentEntry());
        condition.setOperation(ConditionOperation.EQUAL);
        condition.setRelationship(ConditionRelationship.AND);

        condition = criteria.getConditions().create();
        condition.setAlias(MaterialInventoryJournal.PROPERTY_BASEDOCUMENTLINEID.getName());
        condition.setValue(contract.getBaseDocumentLineId());
        condition.setOperation(ConditionOperation.EQUAL);
        condition.setRelationship(ConditionRelationship.AND);

        condition = criteria.getConditions().create();
        condition.setAlias(MaterialInventoryJournal.PROPERTY_DIRECTION.getName());
        condition.setValue(emDirection.IN);
        condition.setOperation(ConditionOperation.EQUAL);
        condition.setRelationship(ConditionRelationship.AND);

        // endregion
        // region 查询物料日记账
        IMaterialInventoryJournal materialJournal = this.fetchBeAffected(criteria, IMaterialInventoryJournal.class);
        if (materialJournal == null) {
            BORepositoryMaterials boRepository = new BORepositoryMaterials();
            boRepository.setRepository(super.getRepository());
            IOperationResult<IMaterialInventoryJournal> operationResult = boRepository.fetchMaterialInventoryJournal(criteria);
            if (operationResult.getError() != null) {
                throw new BusinessLogicException(operationResult.getMessage());
            }
            // endregion
            materialJournal = operationResult.getResultObjects().firstOrDefault();
            if (materialJournal == null) {
                materialJournal = MaterialInventoryJournal.create(contract);
            }
        }
        return materialJournal;
    }

    @Override
    protected void impact(IMaterialReceiptContract contract) {
        IMaterialInventoryJournal materialJournal = this.getBeAffected();
        Decimal receiptQuantity = materialJournal.getQuantity();
        receiptQuantity = receiptQuantity.add(contract.getQuantity());
        materialJournal.setQuantity(receiptQuantity);
    }

    @Override
    protected void revoke(IMaterialReceiptContract contract) {
        IMaterialInventoryJournal materialJournal = this.getBeAffected();
        materialJournal.setItemCode((contract.getItemCode()));
        materialJournal.setItemName(contract.getItemName());
        materialJournal.setWarehouse(contract.getWarehouse());
        Decimal receiptQuantity = materialJournal.getQuantity();
        receiptQuantity = receiptQuantity.subtract(contract.getQuantity());
        materialJournal.setQuantity(receiptQuantity);
    }

    /**
     * 检查契约数据是否合法
     *
     * @return
     */
    private void checkContractData(IMaterialReceiptContract contract) {
        if (contract.getQuantity().compareTo(BigDecimal.ZERO) == 0) {
            throw new BusinessLogicException(I18N.prop("msg_mm_receipt_quantity_can't_be_zero"));
        }
        // region 查询物料
        ICriteria criteria = Criteria.create();
        ICondition condition = criteria.getConditions().create();
        condition.setAlias(Material.PROPERTY_CODE.getName());
        condition.setValue(contract.getItemCode());
        condition.setOperation(ConditionOperation.EQUAL);
        BORepositoryMaterials boRepository = new BORepositoryMaterials();
        boRepository.setRepository(super.getRepository());
        IOperationResult<IMaterial> operationResult = boRepository.fetchMaterial(criteria);
        if (operationResult.getError() != null) {
            throw new BusinessLogicException(operationResult.getMessage());
        }
        IMaterial material = operationResult.getResultObjects().firstOrDefault();
        // endregion
        // region 检查物料
        if (material == null) {
            throw new BusinessLogicException(
                    String.format(I18N.prop("msg_mm_material_is_not_exist"), contract.getItemCode()));
        }
        // 虚拟物料，不生成库存记录
        if (material.getPhantomItem() == emYesNo.YES) {
            throw new BusinessLogicException(String.format(
                    I18N.prop("msg_mm_material_is_phantom_item_can't_create_journal"), contract.getItemCode()));
        }
        // 非库存物料，不生成库存记录
        if (material.getInventoryItem() == emYesNo.NO) {
            throw new BusinessLogicException(
                    String.format(I18N.prop("msg_mm_material_is_not_inventory_item_can't_create_journal"),
                            contract.getItemCode()));
        }
        // endregion
        // region 检查仓库
        if (material.getItemType() == emItemType.ITEM) {
            // 库存物料，检查仓库是否存在
            criteria = Criteria.create();
            condition = criteria.getConditions().create();
            condition.setAlias(Warehouse.PROPERTY_CODE.getName());
            condition.setValue(contract.getWarehouse());
            condition.setOperation(ConditionOperation.EQUAL);
            IOperationResult<IWarehouse> opResult = boRepository.fetchWarehouse(criteria);
            if (opResult.getError() != null) {
                throw new BusinessLogicException(opResult.getMessage());
            }
            IWarehouse warehouse = opResult.getResultObjects().firstOrDefault();
            if (warehouse == null) {
                throw new BusinessLogicException(
                        String.format(I18N.prop("msg_mm_warehouse_is_not_exist"),
                                contract.getWarehouse()));
            }
        }
        // endregion
    }
}
