import React, { useState } from 'react';
import { Sliders, Plus, Check, DollarSign } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { CustomSelect } from '@/components/ui/CustomSelect';
import {
  useCustomFieldDefinitions,
  useCreateCustomFieldDefinition,
  useCustomFieldValues,
  useSetCustomFieldValue,
} from '@/hooks/customField/useCustomFields';
import type { Card } from '@/types';

interface CardCustomFieldsProps {
  card: Card;
}

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'currency', label: 'Currency ($)' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'date', label: 'Date' },
];

export const CardCustomFields: React.FC<CardCustomFieldsProps> = ({ card }) => {
  const { data: definitions = [] } = useCustomFieldDefinitions(card.project_id);
  const { data: values = [] } = useCustomFieldValues(card.id);
  const setCustomFieldValue = useSetCustomFieldValue();
  const createDefinition = useCreateCustomFieldDefinition();

  const [isCreatingField, setIsCreatingField] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState('text');
  const [newFieldOptions, setNewFieldOptions] = useState('');

  // Map values by field_id for fast lookup
  const valueMap = new Map<string, { text?: string | null; number?: number | null }>();
  values.forEach((v) => {
    valueMap.set(v.field_id, { text: v.value_text, number: v.value_number });
  });

  const handleUpdateTextValue = (fieldId: string, text: string) => {
    setCustomFieldValue.mutate({
      card_id: card.id,
      field_id: fieldId,
      value_text: text,
      value_number: null,
    });
  };

  const handleUpdateNumberValue = (fieldId: string, numStr: string) => {
    const val = parseFloat(numStr);
    setCustomFieldValue.mutate({
      card_id: card.id,
      field_id: fieldId,
      value_text: null,
      value_number: isNaN(val) ? null : val,
    });
  };

  const handleToggleCheckbox = (fieldId: string, currentVal?: string | null) => {
    const nextVal = currentVal === 'true' ? 'false' : 'true';
    handleUpdateTextValue(fieldId, nextVal);
  };

  const handleCreateFieldSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFieldName.trim()) return;

    const options =
      newFieldType === 'dropdown'
        ? newFieldOptions
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

    createDefinition.mutate(
      {
        project_id: card.project_id,
        name: newFieldName.trim(),
        field_type: newFieldType,
        options,
      },
      {
        onSuccess: () => {
          setNewFieldName('');
          setNewFieldType('text');
          setNewFieldOptions('');
          setIsCreatingField(false);
        },
      }
    );
  };

  return (
    <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-[#183035]">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5 text-teal-500" />
          Custom Fields
        </label>
        {!isCreatingField && (
          <button
            type="button"
            onClick={() => setIsCreatingField(true)}
            className="text-[11px] font-medium text-teal-600 dark:text-teal-400 hover:text-teal-500 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Plus className="w-3 h-3" />
            <span>Add Field</span>
          </button>
        )}
      </div>

      {/* Field Creator Form */}
      {isCreatingField && (
        <form
          onSubmit={handleCreateFieldSubmit}
          className="p-3 bg-slate-50 dark:bg-[#0d1a1d] border border-slate-200 dark:border-[#183035] rounded-xl space-y-2 animate-in fade-in duration-150"
        >
          <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
            New Project Field
          </div>
          <Input
            type="text"
            placeholder="Field Name (e.g. Environment, Impact)"
            value={newFieldName}
            onChange={(e) => setNewFieldName(e.target.value)}
            className="text-xs h-8"
            required
            autoFocus
          />
          <CustomSelect
            value={newFieldType}
            onChange={setNewFieldType}
            options={FIELD_TYPES}
          />
          {newFieldType === 'dropdown' && (
            <Input
              type="text"
              placeholder="Comma-separated options (Dev, Staging, Prod)"
              value={newFieldOptions}
              onChange={(e) => setNewFieldOptions(e.target.value)}
              className="text-xs h-8"
            />
          )}
          <div className="flex justify-end gap-1.5 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsCreatingField(false)}
              className="h-7 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={createDefinition.isPending}
              className="h-7 text-xs"
            >
              Create
            </Button>
          </div>
        </form>
      )}

      {/* Custom Field List */}
      {definitions.length > 0 ? (
        <div className="space-y-2.5">
          {definitions.map((def) => {
            const current = valueMap.get(def.id);

            return (
              <div key={def.id} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {def.name}
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase">
                    {def.field_type}
                  </span>
                </div>

                {def.field_type === 'text' && (
                  <Input
                    type="text"
                    defaultValue={current?.text || ''}
                    onBlur={(e) => handleUpdateTextValue(def.id, e.target.value)}
                    placeholder="Enter text..."
                    className="text-xs h-8"
                  />
                )}

                {def.field_type === 'number' && (
                  <Input
                    type="number"
                    defaultValue={current?.number ?? ''}
                    onBlur={(e) => handleUpdateNumberValue(def.id, e.target.value)}
                    placeholder="Enter number..."
                    className="text-xs h-8"
                  />
                )}

                {def.field_type === 'currency' && (
                  <div className="relative">
                    <DollarSign className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                    <Input
                      type="number"
                      step="0.01"
                      defaultValue={current?.number ?? ''}
                      onBlur={(e) => handleUpdateNumberValue(def.id, e.target.value)}
                      placeholder="0.00"
                      className="text-xs h-8 pl-8"
                    />
                  </div>
                )}

                {def.field_type === 'date' && (
                  <Input
                    type="date"
                    defaultValue={current?.text || ''}
                    onChange={(e) => handleUpdateTextValue(def.id, e.target.value)}
                    className="text-xs h-8"
                  />
                )}

                {def.field_type === 'dropdown' && (
                  <CustomSelect
                    value={current?.text || ''}
                    onChange={(val) => handleUpdateTextValue(def.id, val)}
                    options={[
                      { value: '', label: 'Select option...' },
                      ...def.options.map((opt) => ({ value: opt, label: opt })),
                    ]}
                  />
                )}

                {def.field_type === 'checkbox' && (
                  <button
                    type="button"
                    onClick={() => handleToggleCheckbox(def.id, current?.text)}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-xs w-full transition-all cursor-pointer ${
                      current?.text === 'true'
                        ? 'bg-teal-500/10 border-teal-500/40 text-teal-600 dark:text-teal-400 font-semibold'
                        : 'bg-slate-50 dark:bg-[#0d1a1d] border-slate-200 dark:border-[#183035] text-slate-500'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center ${
                        current?.text === 'true'
                          ? 'bg-teal-500 border-teal-500 text-slate-950'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {current?.text === 'true' && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span>{current?.text === 'true' ? 'Yes / Enabled' : 'No / Disabled'}</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        !isCreatingField && (
          <div className="text-xs text-slate-400 dark:text-slate-500 italic py-1">
            No custom fields configured for this project.
          </div>
        )
      )}
    </div>
  );
};
