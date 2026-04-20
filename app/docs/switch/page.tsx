"use client";

import { useState } from "react";
import { Switch } from "@/registry/default/switch";
import { ComponentPreview } from "@/lib/docs/ComponentPreview";
import { PropsTable, type PropDef } from "@/lib/docs/PropsTable";
import { DocPage, DocSection } from "@/lib/docs/DocPage";

const basicCode = `import { Switch } from "./components";
import { useState } from "react";

const [checked, setChecked] = useState(false);

<Switch
  label="Notifications"
  checked={checked}
  onToggle={() => setChecked((prev) => !prev)}
/>`;

const disabledCode = `<Switch
  label="Disabled option"
  checked={false}
  onToggle={() => {}}
  disabled
/>`;

const checkboxCode = `// Checkbox variant shares its visual with CheckboxGroup /
// CheckboxItem. Ideal for single-row selection, opt-ins,
// and any place a square + check mark reads better than a pill.
<Switch
  variant="checkbox"
  label="I agree to the terms"
  checked={checked}
  onToggle={() => setChecked((p) => !p)}
/>

{/* hideLabel hides the label visually but keeps it for screen readers */}
<Switch variant="checkbox" hideLabel label="Select row" checked={checked} onToggle={...} />`;

const switchProps: PropDef[] = [
  { name: "label", type: "string", description: "Text label displayed next to the switch." },
  { name: "checked", type: "boolean", description: "Whether the switch is on." },
  { name: "onToggle", type: "() => void", description: "Called when the switch is toggled." },
  { name: "disabled", type: "boolean", default: "false", description: "Disables the switch." },
  { name: "variant", type: '"pill" | "checkbox"', default: '"pill"', description: "`pill` is the sliding toggle; `checkbox` renders a square + check mark, matching CheckboxGroup." },
  { name: "hideLabel", type: "boolean", default: "false", description: "Hides the label visually but keeps it readable by screen readers." },
];

export default function SwitchDoc() {
  const [checked, setChecked] = useState(false);

  return (
    <DocPage
      title="Switch"
      slug="switch"
      description="Toggle switch with animated thumb and label."
    >
      <DocSection title="Basic">
        <ComponentPreview code={basicCode}>
          <Switch
            label="Notifications"
            checked={checked}
            onToggle={() => setChecked((prev) => !prev)}
          />
        </ComponentPreview>
      </DocSection>

      <DocSection title="Disabled">
        <ComponentPreview code={disabledCode}>
          <Switch
            label="Disabled option"
            checked={false}
            onToggle={() => {}}
            disabled
          />
        </ComponentPreview>
      </DocSection>

      <DocSection title="Checkbox Variant">
        <ComponentPreview code={checkboxCode}>
          <div className="flex flex-col gap-3">
            <Switch
              variant="checkbox"
              label="I agree to the terms"
              checked={checked}
              onToggle={() => setChecked((p) => !p)}
            />
            <Switch
              variant="checkbox"
              label="Subscribe to updates"
              checked={!checked}
              onToggle={() => setChecked((p) => !p)}
            />
          </div>
        </ComponentPreview>
      </DocSection>

      <DocSection title="API Reference">
        <PropsTable props={switchProps} />
      </DocSection>
    </DocPage>
  );
}
