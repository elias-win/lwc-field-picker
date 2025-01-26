import LightningModal from "lightning/modal";
import { getObjectInfo } from "lightning/uiObjectInfoApi";
import { getRecord } from "lightning/uiRecordApi";
import { api, track, wire } from "lwc";

export default class FieldPicker extends LightningModal {
  @api objectApiName;
  @api recordId;

  loading = false;

  @track selectedObjects = [];

  @track objectInfoMap = {};

  @track recordFields = [];
  @track recordFieldValues;

  @track childObjectApiName;

  updateRecordFields() {
    const getRecordFields = (parentPath, level) => {
      const selectedObject = this.selectedObjects[level];
      const objectInfo = this.objectInfoMap[selectedObject.apiName];

      const paths = Object.entries(objectInfo)
        // eslint-disable-next-line no-unused-vars
        .filter(([key, field]) => !field.referenceToInfos?.length)
        .map(([key]) => {
          return `${parentPath}.${key}`;
        });

      if (level + 1 < this.selectedObjects.length) {
        const reference = objectInfo[selectedObject.value];

        return [
          ...paths,
          ...getRecordFields(
            `${parentPath}.${reference.relationshipName}`,
            level + 1,
          ),
        ];
      }

      return paths;
    };

    this.recordFields = getRecordFields(this.objectApiName, 0);
  }

  @wire(getObjectInfo, { objectApiName: "$objectApiName" })
  getObjectInfo({ error, data }) {
    if (data) {
      this.objectInfoMap[this.objectApiName] = data.fields;

      this.selectedObjects = [
        {
          apiName: this.objectApiName,
        },
      ];

      this.updateRecordFields();
    } else if (error) {
      console.error(error);
    }
  }

  @wire(getObjectInfo, { objectApiName: "$childObjectApiName" })
  getChildObjectInfo({ error, data }) {
    if (data) {
      this.objectInfoMap[data.apiName] = data.fields;

      this.updateRecordFields();
    } else if (error) {
      console.error(error);
    }

    this.childObjectApiName = undefined;
  }

  @wire(getRecord, {
    recordId: "$recordId",
    optionalFields: "$recordFields",
  })
  getRecordFieldValues({ error, data }) {
    if (data) {
      this.recordFieldValues = data;
    } else if (error) {
      console.error(error);
    }
  }

  onChangeInput({ target }) {
    const index = parseInt(target.dataset.index, 10);

    const selectedFieldKey = target.value;

    const changedObject = this.selectedObjects[index];

    if (!changedObject) {
      console.error("Failed to find object " + index);
      return;
    }

    changedObject.value = selectedFieldKey;

    const selectedField =
      this.objectInfoMap[changedObject.apiName][selectedFieldKey];

    if (
      selectedField.relationshipName &&
      selectedField.referenceToInfos?.length
    ) {
      const apiName = selectedField.referenceToInfos[0].apiName;

      this.selectedObjects = [
        ...this.selectedObjects,
        {
          apiName,
        },
      ];

      if (!this.objectInfoMap[apiName]) {
        this.childObjectApiName = apiName;
      } else {
        this.updateRecordFields();
      }
      this.selectedObjects = this.selectedObjects.slice(0, index + 2);
    } else {
      this.selectedObjects = this.selectedObjects.slice(0, index + 1);
    }
  }

  getOptionsFromFields(fields, values) {
    return Object.entries(fields)
      .map(([key, field]) => {
        const currentValue = values?.[key]?.value;

        if (field.relationshipName) {
          return {
            label: field.relationshipName,
            value: key,
          };
        }

        return {
          label:
            currentValue != null
              ? `${field.label} ("${currentValue}")`
              : field.label,
          value: key,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  get inputs() {
    return this.selectedObjects.map(({ apiName }, index) => {
      let fieldValues = this.recordFieldValues?.fields;

      if (fieldValues && index > 0) {
        const keys = this.selectedObjects
          .slice(0, index)
          .map(
            (innerSelectedObject) =>
              this.objectInfoMap[innerSelectedObject.apiName][
                innerSelectedObject.value
              ].relationshipName,
          );

        for (let key of keys) {
          if (fieldValues[key]?.value?.fields) {
            fieldValues = fieldValues[key].value.fields;
          } else {
            fieldValues = undefined;
            break;
          }
        }
      }
      return {
        options: this.getOptionsFromFields(
          this.objectInfoMap[apiName] ?? [],
          fieldValues,
        ),
        label: apiName,
        index,
      };
    });
  }

  async handleOkay() {
    const path = this.selectedObjects
      .map((selectedObject) => {
        const field =
          this.objectInfoMap[selectedObject.apiName][selectedObject.value];

        if (field.relationshipName) {
          return field.relationshipName;
        }

        return selectedObject.value;
      })
      .join(".");

    this.close(path);
  }
}
