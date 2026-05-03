"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface ComboboxProps<T> {
  options: T[];
  getValue: (item: T) => string;
  getLabel: (item: T) => string;
  value: string | null;
  freeText: string | null;
  onChange: (value: string | null, freeText: string | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  allowFreeText?: boolean;
  disabled?: boolean;
  className?: string;
}

export function Combobox<T>({
  options,
  getValue,
  getLabel,
  value,
  freeText,
  onChange,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No matches.",
  allowFreeText = false,
  disabled,
  className,
}: ComboboxProps<T>) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const selected = React.useMemo(
    () => options.find((o) => getValue(o) === value) ?? null,
    [options, value, getValue]
  );

  const buttonLabel = selected ? getLabel(selected) : freeText && freeText.length > 0 ? freeText : placeholder;

  function handleSelect(itemValue: string) {
    const item = options.find((o) => getValue(o) === itemValue);
    if (item) {
      onChange(getValue(item), null);
    }
    setOpen(false);
  }

  function handleFreeTextCommit() {
    if (!allowFreeText) return;
    const trimmed = query.trim();
    if (trimmed.length === 0) return;
    onChange(null, trimmed);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !selected && !freeText && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">{buttonLabel}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter>
          <CommandInput
            placeholder={searchPlaceholder}
            value={query}
            onValueChange={setQuery}
            onKeyDown={(e) => {
              if (e.key === "Enter" && allowFreeText) {
                const matches = options.filter((o) =>
                  getLabel(o).toLowerCase().includes(query.toLowerCase())
                );
                if (matches.length === 0) {
                  e.preventDefault();
                  handleFreeTextCommit();
                }
              }
            }}
          />
          <CommandList>
            <CommandEmpty>
              {allowFreeText && query.trim().length > 0 ? (
                <button
                  type="button"
                  className="mx-auto block w-full rounded-md px-3 py-2 text-sm hover:bg-accent"
                  onClick={handleFreeTextCommit}
                >
                  Use &quot;{query.trim()}&quot;
                </button>
              ) : (
                emptyText
              )}
            </CommandEmpty>
            <CommandGroup>
              {options.map((opt) => {
                const v = getValue(opt);
                const label = getLabel(opt);
                return (
                  <CommandItem
                    key={v}
                    value={`${v} ${label}`}
                    onSelect={() => handleSelect(v)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === v ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {label}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
