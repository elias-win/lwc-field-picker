# Lightning Field-Picker

This is field-picker component for Salesforce Lightning.

## How to install

1. Clone or download this repository
2. Copy the `fieldPicker` component directory into your project's `lwc` directory
3. Deploy the component

```js
  async getField() {
    const fieldPath = await FieldPicker.open({
      description: "Field picker",
      label: "Field picker",
      size: "large",
      objectApiName: this.objectApiName,
      recordId: this.recordId
    });
  }
```
