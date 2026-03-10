"use client";

import { useState } from "react";
import {
  Globe,
  Sun,
  Moon,
  Monitor,
  Mail,
  Bell,
  Shield,
  User,
} from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
} from "@/registry/default/select";
import { ComponentPreview } from "@/lib/docs/ComponentPreview";
import { PropsTable, type PropDef } from "@/lib/docs/PropsTable";
import { DocPage, DocSection } from "@/lib/docs/DocPage";

// ---------------------------------------------------------------------------
// Code snippets
// ---------------------------------------------------------------------------

const basicCode = `import { Select, SelectTrigger, SelectContent, SelectItem } from "./components";
import { useState } from "react";

const [value, setValue] = useState("");

<Select value={value} onValueChange={setValue}>
  <SelectTrigger placeholder="Select a fruit…" />
  <SelectContent>
    <SelectItem index={0} value="apple">Apple</SelectItem>
    <SelectItem index={1} value="banana">Banana</SelectItem>
    <SelectItem index={2} value="cherry">Cherry</SelectItem>
    <SelectItem index={3} value="mango">Mango</SelectItem>
  </SelectContent>
</Select>`;

const variantsCode = `import { Select, SelectTrigger, SelectContent, SelectItem } from "./components";

{/* Bordered (default) */}
<Select>
  <SelectTrigger variant="bordered" placeholder="Bordered" />
  <SelectContent>
    <SelectItem index={0} value="a">Option A</SelectItem>
    <SelectItem index={1} value="b">Option B</SelectItem>
  </SelectContent>
</Select>

{/* Borderless */}
<Select>
  <SelectTrigger variant="borderless" placeholder="Borderless" />
  <SelectContent>
    <SelectItem index={0} value="a">Option A</SelectItem>
    <SelectItem index={1} value="b">Option B</SelectItem>
  </SelectContent>
</Select>`;

const iconsCode = `import { Select, SelectTrigger, SelectContent, SelectItem } from "./components";
import { Globe, Sun, Moon, Monitor } from "lucide-react";

<Select defaultValue="system">
  <SelectTrigger icon={Globe} placeholder="Theme" />
  <SelectContent>
    <SelectItem index={0} value="light" icon={Sun}>Light</SelectItem>
    <SelectItem index={1} value="dark" icon={Moon}>Dark</SelectItem>
    <SelectItem index={2} value="system" icon={Monitor}>System</SelectItem>
  </SelectContent>
</Select>`;

const groupsCode = `import { Select, SelectTrigger, SelectContent, SelectItem, SelectGroup, SelectLabel, SelectSeparator } from "./components";
import { Mail, Bell, Shield, User } from "lucide-react";

<Select>
  <SelectTrigger placeholder="Settings…" />
  <SelectContent>
    <SelectGroup>
      <SelectLabel>Account</SelectLabel>
      <SelectItem index={0} value="profile" icon={User}>Profile</SelectItem>
      <SelectItem index={1} value="email" icon={Mail}>Email</SelectItem>
    </SelectGroup>
    <SelectSeparator />
    <SelectGroup>
      <SelectLabel>Preferences</SelectLabel>
      <SelectItem index={2} value="notifications" icon={Bell}>Notifications</SelectItem>
      <SelectItem index={3} value="privacy" icon={Shield}>Privacy</SelectItem>
    </SelectGroup>
  </SelectContent>
</Select>`;

const disabledCode = `import { Select, SelectTrigger, SelectContent, SelectItem } from "./components";

{/* Disabled trigger */}
<Select disabled>
  <SelectTrigger placeholder="Disabled" />
  <SelectContent>
    <SelectItem index={0} value="a">Option A</SelectItem>
  </SelectContent>
</Select>

{/* Disabled individual items */}
<Select>
  <SelectTrigger placeholder="Some disabled…" />
  <SelectContent>
    <SelectItem index={0} value="a">Available</SelectItem>
    <SelectItem index={1} value="b" disabled>Unavailable</SelectItem>
    <SelectItem index={2} value="c">Available</SelectItem>
  </SelectContent>
</Select>`;

// ---------------------------------------------------------------------------
// Props definitions
// ---------------------------------------------------------------------------

const selectProps: PropDef[] = [
  {
    name: "value",
    type: "string",
    description: "Controlled selected value.",
  },
  {
    name: "defaultValue",
    type: "string",
    description: "Uncontrolled default value.",
  },
  {
    name: "onValueChange",
    type: "(value: string) => void",
    description: "Called when the selected value changes.",
  },
  {
    name: "disabled",
    type: "boolean",
    default: "false",
    description: "Disables the entire select.",
  },
  {
    name: "name",
    type: "string",
    description: "Name for form submission.",
  },
  {
    name: "required",
    type: "boolean",
    default: "false",
    description: "Marks the select as required in forms.",
  },
];

const triggerProps: PropDef[] = [
  {
    name: "variant",
    type: '"bordered" | "borderless"',
    default: '"bordered"',
    description: "Visual style of the trigger.",
  },
  {
    name: "icon",
    type: "LucideIcon",
    description: "Optional icon displayed before the value.",
  },
  {
    name: "placeholder",
    type: "string",
    default: '"Select…"',
    description: "Text shown when no value is selected.",
  },
];

const itemProps: PropDef[] = [
  {
    name: "index",
    type: "number",
    description: "Position index within the content for proximity hover.",
  },
  {
    name: "value",
    type: "string",
    description: "Unique value for this option.",
  },
  {
    name: "icon",
    type: "LucideIcon",
    description: "Optional icon displayed before the label.",
  },
  {
    name: "disabled",
    type: "boolean",
    default: "false",
    description: "Disables this individual item.",
  },
];

// ---------------------------------------------------------------------------
// Doc Page
// ---------------------------------------------------------------------------

export default function SelectDoc() {
  const [basic, setBasic] = useState("");
  const [bordered, setBordered] = useState("");
  const [borderless, setBorderless] = useState("");

  return (
    <DocPage
      title="Select"
      slug="select"
      description="Animated select menu with proximity hover, bordered/borderless variants, optional leading icons, and spring-animated popover."
    >
      <DocSection title="Basic">
        <ComponentPreview code={basicCode}>
          <Select value={basic} onValueChange={setBasic}>
            <SelectTrigger placeholder="Select a fruit…" />
            <SelectContent>
              <SelectItem index={0} value="apple">Apple</SelectItem>
              <SelectItem index={1} value="banana">Banana</SelectItem>
              <SelectItem index={2} value="cherry">Cherry</SelectItem>
              <SelectItem index={3} value="mango">Mango</SelectItem>
            </SelectContent>
          </Select>
        </ComponentPreview>
      </DocSection>

      <DocSection title="Variants">
        <ComponentPreview code={variantsCode}>
          <div className="flex flex-wrap items-center gap-3">
            <Select value={bordered} onValueChange={setBordered}>
              <SelectTrigger variant="bordered" placeholder="Bordered" />
              <SelectContent>
                <SelectItem index={0} value="apple">Apple</SelectItem>
                <SelectItem index={1} value="banana">Banana</SelectItem>
                <SelectItem index={2} value="cherry">Cherry</SelectItem>
              </SelectContent>
            </Select>

            <Select value={borderless} onValueChange={setBorderless}>
              <SelectTrigger variant="borderless" placeholder="Borderless" />
              <SelectContent>
                <SelectItem index={0} value="apple">Apple</SelectItem>
                <SelectItem index={1} value="banana">Banana</SelectItem>
                <SelectItem index={2} value="cherry">Cherry</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </ComponentPreview>
      </DocSection>

      <DocSection title="With Icons">
        <ComponentPreview code={iconsCode}>
          <Select defaultValue="system">
            <SelectTrigger icon={Globe} placeholder="Theme" />
            <SelectContent>
              <SelectItem index={0} value="light" icon={Sun}>Light</SelectItem>
              <SelectItem index={1} value="dark" icon={Moon}>Dark</SelectItem>
              <SelectItem index={2} value="system" icon={Monitor}>System</SelectItem>
            </SelectContent>
          </Select>
        </ComponentPreview>
      </DocSection>

      <DocSection title="Groups">
        <ComponentPreview code={groupsCode}>
          <Select>
            <SelectTrigger placeholder="Settings…" />
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Account</SelectLabel>
                <SelectItem index={0} value="profile" icon={User}>Profile</SelectItem>
                <SelectItem index={1} value="email" icon={Mail}>Email</SelectItem>
              </SelectGroup>
              <SelectSeparator />
              <SelectGroup>
                <SelectLabel>Preferences</SelectLabel>
                <SelectItem index={2} value="notifications" icon={Bell}>Notifications</SelectItem>
                <SelectItem index={3} value="privacy" icon={Shield}>Privacy</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </ComponentPreview>
      </DocSection>

      <DocSection title="Disabled">
        <ComponentPreview code={disabledCode}>
          <div className="flex flex-wrap items-center gap-3">
            <Select disabled>
              <SelectTrigger placeholder="Disabled" />
              <SelectContent>
                <SelectItem index={0} value="a">Option A</SelectItem>
              </SelectContent>
            </Select>

            <Select>
              <SelectTrigger placeholder="Some disabled…" />
              <SelectContent>
                <SelectItem index={0} value="a">Available</SelectItem>
                <SelectItem index={1} value="b" disabled>Unavailable</SelectItem>
                <SelectItem index={2} value="c">Available</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </ComponentPreview>
      </DocSection>

      <DocSection title="API Reference — Select">
        <PropsTable props={selectProps} />
      </DocSection>

      <DocSection title="API Reference — SelectTrigger">
        <PropsTable props={triggerProps} />
      </DocSection>

      <DocSection title="API Reference — SelectItem">
        <PropsTable props={itemProps} />
      </DocSection>
    </DocPage>
  );
}
