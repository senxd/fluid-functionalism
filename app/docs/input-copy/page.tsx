"use client";

import { InputCopy } from "@/registry/default/input-copy";
import { ComponentPreview } from "@/lib/docs/ComponentPreview";
import { PropsTable, type PropDef } from "@/lib/docs/PropsTable";
import { DocPage, DocSection } from "@/lib/docs/DocPage";

const basicCode = `import { InputCopy } from "./components";

<InputCopy value="npx shadcn@latest add input-copy" />`;

const labelCode = `import { InputCopy } from "./components";

<InputCopy
  label="Install command"
  value="npx shadcn@latest add input-copy"
/>`;

const urlCode = `import { InputCopy } from "./components";

<InputCopy
  label="API endpoint"
  value="https://api.example.com/v1/users"
/>`;

const disabledCode = `import { InputCopy } from "./components";

<InputCopy
  label="Invite code"
  value="ABCD-1234-EFGH"
  disabled
/>`;

const callbackCode = `import { InputCopy } from "./components";

<InputCopy
  label="Share link"
  value="https://fluidfunctionalism.com/r/input-copy"
  onCopy={() => console.log("Copied!")}
/>`;

const inputCopyProps: PropDef[] = [
  { name: "value", type: "string", description: "The text value to display and copy to clipboard." },
  { name: "label", type: "string", description: "Optional label displayed above the input." },
  { name: "onCopy", type: "() => void", description: "Callback fired after the value is successfully copied." },
  { name: "disabled", type: "boolean", default: "false", description: "Disables the input and copy button." },
];

export default function InputCopyDoc() {
  return (
    <DocPage
      title="InputCopy"
      slug="input-copy"
      description="Read-only input with a copy-to-clipboard button and animated check feedback."
    >
      <DocSection title="Basic">
        <ComponentPreview code={basicCode}>
          <div className="w-72">
            <InputCopy value="npx shadcn@latest add input-copy" />
          </div>
        </ComponentPreview>
      </DocSection>

      <DocSection title="With Label">
        <ComponentPreview code={labelCode}>
          <div className="w-72">
            <InputCopy
              label="Install command"
              value="npx shadcn@latest add input-copy"
            />
          </div>
        </ComponentPreview>
      </DocSection>

      <DocSection title="Long Value">
        <ComponentPreview code={urlCode}>
          <div className="w-72">
            <InputCopy
              label="API endpoint"
              value="https://api.example.com/v1/users"
            />
          </div>
        </ComponentPreview>
      </DocSection>

      <DocSection title="Disabled">
        <ComponentPreview code={disabledCode}>
          <div className="w-72">
            <InputCopy
              label="Invite code"
              value="ABCD-1234-EFGH"
              disabled
            />
          </div>
        </ComponentPreview>
      </DocSection>

      <DocSection title="Copy Callback">
        <ComponentPreview code={callbackCode}>
          <div className="w-72">
            <InputCopy
              label="Share link"
              value="https://fluidfunctionalism.com/r/input-copy"
              onCopy={() => console.log("Copied!")}
            />
          </div>
        </ComponentPreview>
      </DocSection>

      <DocSection title="API Reference">
        <PropsTable props={inputCopyProps} />
      </DocSection>
    </DocPage>
  );
}
