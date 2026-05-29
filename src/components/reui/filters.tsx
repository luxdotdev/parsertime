"use client";

import { Button } from "@/components/ui/button";
import { ButtonGroup, ButtonGroupText } from "@/components/ui/button-group";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CheckIcon, ListFilterIcon, XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/**
 * A Linear-style filter bar, adapted to this project's Radix primitives.
 *
 * Each active filter renders as a segmented chip: [icon · field] [operator]
 * [value] [✕]. "Add filter" opens a searchable, grouped field picker. The
 * component is generic over the value type and the operator vocabulary, so the
 * caller controls operators and value options (including async-loaded ones).
 */

export type FilterValue = string | number;

export type FilterOption = {
  value: string;
  label: string;
  icon?: React.ReactNode;
};

export type FilterOperator = {
  value: string;
  label: string;
};

export type FilterFieldType = "select" | "multiselect" | "text" | "number";

export type FilterFieldConfig = {
  key: string;
  label: string;
  icon?: React.ReactNode;
  type: FilterFieldType;
  options?: FilterOption[];
  /** lazily resolve options the first time the field is used */
  loadOptions?: () => Promise<FilterOption[]>;
  operators: FilterOperator[];
  defaultOperator: string;
  placeholder?: string;
  unit?: string;
  /** operators that take no value (rendered without a value segment) */
  valuelessOperators?: string[];
};

export type FilterFieldGroup = {
  group: string;
  fields: FilterFieldConfig[];
};

export type FilterFieldsConfig = (FilterFieldConfig | FilterFieldGroup)[];

export type Filter = {
  id: string;
  field: string;
  operator: string;
  values: FilterValue[];
};

let filterSeq = 0;
export function createFilter(
  field: string,
  operator: string,
  values: FilterValue[] = []
): Filter {
  filterSeq += 1;
  return { id: `f${filterSeq}-${field}`, field, operator, values };
}

function isGroup(
  item: FilterFieldConfig | FilterFieldGroup
): item is FilterFieldGroup {
  return "fields" in item;
}

function flatten(fields: FilterFieldsConfig): FilterFieldConfig[] {
  return fields.flatMap((item) => (isGroup(item) ? item.fields : [item]));
}

function fieldsMap(
  fields: FilterFieldsConfig
): Record<string, FilterFieldConfig> {
  const map: Record<string, FilterFieldConfig> = {};
  for (const f of flatten(fields)) map[f.key] = f;
  return map;
}

const SEGMENT =
  "h-8 rounded-none border-0 bg-transparent px-2 text-sm font-normal shadow-none";

export function Filters({
  filters,
  fields,
  onChange,
  trigger,
  addFilterLabel = "Add filter",
  searchPlaceholder = "Search fields...",
  emptyText = "No fields found.",
  noOptionsText = "No values found.",
  enableShortcut = false,
  shortcutKey = "f",
  shortcutLabel = "F",
  className,
}: {
  filters: Filter[];
  fields: FilterFieldsConfig;
  onChange: (filters: Filter[]) => void;
  trigger?: React.ReactNode;
  addFilterLabel?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  noOptionsText?: string;
  enableShortcut?: boolean;
  shortcutKey?: string;
  shortcutLabel?: string;
  className?: string;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const map = fieldsMap(fields);
  const [justAdded, setJustAdded] = useState<string | null>(null);

  useEffect(() => {
    if (!enableShortcut) return;
    function onKey(e: KeyboardEvent) {
      const tag = document.activeElement?.tagName;
      if (
        e.key.toLowerCase() === shortcutKey.toLowerCase() &&
        !addOpen &&
        tag !== "INPUT" &&
        tag !== "TEXTAREA"
      ) {
        e.preventDefault();
        setAddOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enableShortcut, shortcutKey, addOpen]);

  function update(id: string, patch: Partial<Filter>) {
    onChange(filters.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }
  function remove(id: string) {
    onChange(filters.filter((f) => f.id !== id));
  }
  function add(field: FilterFieldConfig) {
    const filter = createFilter(field.key, field.defaultOperator, []);
    onChange([...filters, filter]);
    setAddOpen(false);
    setJustAdded(filter.id);
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {filters.map((filter) => {
        const field = map[filter.field];
        if (!field) return null;
        return (
          <FilterChip
            key={filter.id}
            field={field}
            filter={filter}
            autoOpen={justAdded === filter.id}
            onAutoOpenDone={() => setJustAdded(null)}
            noOptionsText={noOptionsText}
            onOperator={(operator) => update(filter.id, { operator })}
            onValues={(values) => update(filter.id, { values })}
            onRemove={() => remove(filter.id)}
          />
        );
      })}

      <Popover open={addOpen} onOpenChange={setAddOpen}>
        <PopoverTrigger asChild>
          {trigger ?? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 border-dashed"
            >
              <ListFilterIcon className="size-4" aria-hidden="true" />
              {addFilterLabel}
            </Button>
          )}
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-0">
          <Command>
            <div className="relative">
              <CommandInput placeholder={searchPlaceholder} />
              {enableShortcut && (
                <Kbd className="bg-muted absolute top-2.5 right-2 border">
                  {shortcutLabel}
                </Kbd>
              )}
            </div>
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              {fields.map((item) =>
                isGroup(item) ? (
                  <CommandGroup key={item.group} heading={item.group}>
                    {item.fields.map((field) => (
                      <FieldItem key={field.key} field={field} onAdd={add} />
                    ))}
                  </CommandGroup>
                ) : (
                  <CommandGroup key={item.key}>
                    <FieldItem field={item} onAdd={add} />
                  </CommandGroup>
                )
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function FieldItem({
  field,
  onAdd,
}: {
  field: FilterFieldConfig;
  onAdd: (field: FilterFieldConfig) => void;
}) {
  return (
    <CommandItem value={field.label} onSelect={() => onAdd(field)}>
      {field.icon && (
        <span className="text-muted-foreground [&_svg]:size-4">
          {field.icon}
        </span>
      )}
      {field.label}
    </CommandItem>
  );
}

function FilterChip({
  field,
  filter,
  autoOpen,
  onAutoOpenDone,
  noOptionsText,
  onOperator,
  onValues,
  onRemove,
}: {
  field: FilterFieldConfig;
  filter: Filter;
  autoOpen: boolean;
  onAutoOpenDone: () => void;
  noOptionsText: string;
  onOperator: (operator: string) => void;
  onValues: (values: FilterValue[]) => void;
  onRemove: () => void;
}) {
  const valueless = field.valuelessOperators?.includes(filter.operator);
  const operatorLabel =
    field.operators.find((o) => o.value === filter.operator)?.label ??
    filter.operator;

  return (
    <ButtonGroup>
      <ButtonGroupText className="bg-card text-foreground gap-1.5 [&_svg]:size-4">
        {field.icon && (
          <span className="text-muted-foreground">{field.icon}</span>
        )}
        {field.label}
      </ButtonGroupText>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              SEGMENT,
              "text-muted-foreground hover:text-foreground"
            )}
          >
            {operatorLabel}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-fit">
          {field.operators.map((op) => (
            <DropdownMenuItem
              key={op.value}
              onClick={() => onOperator(op.value)}
              className="justify-between gap-4"
            >
              {op.label}
              <CheckIcon
                className={cn(
                  "text-primary size-4",
                  op.value === filter.operator ? "opacity-100" : "opacity-0"
                )}
                aria-hidden="true"
              />
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {!valueless && (
        <ValueSegment
          field={field}
          values={filter.values}
          autoOpen={autoOpen}
          onAutoOpenDone={onAutoOpenDone}
          noOptionsText={noOptionsText}
          onChange={onValues}
        />
      )}

      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label="Remove filter"
        onClick={onRemove}
        className="text-muted-foreground hover:text-foreground rounded-none"
      >
        <XIcon className="size-3.5" aria-hidden="true" />
      </Button>
    </ButtonGroup>
  );
}

function ValueSegment({
  field,
  values,
  autoOpen,
  onAutoOpenDone,
  noOptionsText,
  onChange,
}: {
  field: FilterFieldConfig;
  values: FilterValue[];
  autoOpen: boolean;
  onAutoOpenDone: () => void;
  noOptionsText: string;
  onChange: (values: FilterValue[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<FilterOption[]>(field.options ?? []);
  const [loading, setLoading] = useState(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (autoOpen) {
      setOpen(true);
      onAutoOpenDone();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpen]);

  // Reset cached options when the field changes (e.g. the team or dataset
  // switched), so a stale empty result isn't shown for the new scope.
  useEffect(() => {
    loadedRef.current = false;
    setOptions(field.options ?? []);
  }, [field]);

  useEffect(() => {
    if (open && field.loadOptions && !loadedRef.current) {
      loadedRef.current = true;
      setLoading(true);
      void field.loadOptions().then((opts) => {
        setOptions(opts);
        setLoading(false);
      });
    }
  }, [open, field]);

  if (field.type === "text" || field.type === "number") {
    return (
      <Input
        type={field.type === "number" ? "number" : "text"}
        inputMode={field.type === "number" ? "decimal" : undefined}
        value={values[0] !== undefined ? String(values[0]) : ""}
        placeholder={field.placeholder ?? field.label}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") return onChange([]);
          onChange([field.type === "number" ? Number(raw) : raw]);
        }}
        className={cn(SEGMENT, "w-32")}
      />
    );
  }

  const isMulti = field.type === "multiselect";
  const selected = options.filter((o) => values.includes(o.value));
  const display =
    selected.length === 0
      ? (field.placeholder ?? "Select")
      : selected.length === 1
        ? selected[0].label
        : `${selected.length} selected`;

  function toggle(value: string) {
    if (isMulti) {
      onChange(
        values.includes(value)
          ? values.filter((v) => v !== value)
          : [...values, value]
      );
    } else {
      onChange([value]);
      setOpen(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(SEGMENT, "max-w-48 gap-1.5")}
        >
          {selected.length > 0 && selected.length <= 3 && (
            <span className="flex items-center -space-x-1 [&_svg]:size-4">
              {selected.map(
                (o) => o.icon && <span key={o.value}>{o.icon}</span>
              )}
            </span>
          )}
          <span className="truncate">{display}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-0">
        <Command>
          {(options.length > 7 || field.loadOptions) && (
            <CommandInput placeholder="Search" />
          )}
          <CommandList>
            <CommandEmpty>{loading ? "Loading…" : noOptionsText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => toggle(option.value)}
                >
                  {option.icon && (
                    <span className="[&_svg]:size-4">{option.icon}</span>
                  )}
                  <span className="truncate">{option.label}</span>
                  <CheckIcon
                    className={cn(
                      "text-primary ml-auto size-4",
                      values.includes(option.value)
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                    aria-hidden="true"
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
