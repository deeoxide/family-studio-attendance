import React, { useState } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/state/LanguageContext';
import { jobOrderApi } from '@/api/endpoints';
import { ApiError } from '@/api/client';
import type { JobWorkType } from '@/api/types';
import { color, radius, bodyFont, headingFont, shadow } from '@/theme/tokens';
import { PrimaryButton, ErrorNote } from '@/components/ui';

const WORK_TYPES: JobWorkType[] = ['INTERNAL', 'EXTERNAL'];
const WORK_TYPE_KEY: Record<JobWorkType, 'workInternal' | 'workExternal'> = {
  INTERNAL: 'workInternal',
  EXTERNAL: 'workExternal',
};

export function NewJobOrderModal({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: (msg: string) => void;
}) {
  const { lang, t } = useLanguage();
  const qc = useQueryClient();
  const [workType, setWorkType] = useState<JobWorkType>('INTERNAL');
  const [clientCode, setClientCode] = useState('');
  const [task, setTask] = useState('');
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setWorkType('INTERNAL');
    setClientCode('');
    setTask('');
    setError(null);
  };

  const createMut = useMutation({
    mutationFn: () => jobOrderApi.create({ clientCode: clientCode.trim(), workType, task: task.trim() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jobOrders'] });
      onCreated(t('jobCreated'));
      reset();
      onClose();
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : t('errorGeneric')),
  });

  const canSubmit = clientCode.trim().length > 0 && task.trim().length > 0;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(32,31,29,0.32)' }} onPress={onClose} />
        <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 14, borderTopRightRadius: 14, padding: 20, paddingBottom: 34, gap: 14, maxHeight: '85%', ...shadow.lg }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Text style={{ fontFamily: headingFont(lang), fontWeight: '600', fontSize: 20, color: color.text }}>{t('newJobOrder')}</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={{ fontSize: 20, color: color.neutral700 }}>×</Text>
            </Pressable>
          </View>

          <View>
            <Text style={{ fontFamily: bodyFont(lang), fontSize: 12, color: color.neutral700, marginBottom: 7 }}>{t('typeOfWork')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {WORK_TYPES.map((wt) => {
                const active = workType === wt;
                return (
                  <Pressable
                    key={wt}
                    onPress={() => setWorkType(wt)}
                    style={{
                      minHeight: 44,
                      paddingHorizontal: 14,
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: active ? color.accent : color.divider,
                      backgroundColor: active ? color.accent100 : 'transparent',
                      borderRadius: radius.md,
                    }}
                  >
                    <Text style={{ fontFamily: bodyFont(lang), fontSize: 12.5, color: active ? color.accent800 : color.neutral800 }}>{t(WORK_TYPE_KEY[wt])}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View>
            <Text style={{ fontFamily: bodyFont(lang), fontSize: 12, color: color.neutral700, marginBottom: 6 }}>{t('clientCode')}</Text>
            <TextInput
              value={clientCode}
              onChangeText={setClientCode}
              placeholder={t('clientCodeHint')}
              placeholderTextColor={color.neutral500}
              autoCapitalize="characters"
              style={{ minHeight: 46, borderWidth: 1, borderColor: color.divider, borderRadius: radius.md, paddingHorizontal: 12, fontFamily: bodyFont(lang), fontSize: 14, color: color.text }}
            />
          </View>

          <View>
            <Text style={{ fontFamily: bodyFont(lang), fontSize: 12, color: color.neutral700, marginBottom: 6 }}>{t('task')}</Text>
            <TextInput
              value={task}
              onChangeText={setTask}
              placeholder={t('taskHint')}
              placeholderTextColor={color.neutral500}
              multiline
              numberOfLines={3}
              style={{ minHeight: 76, borderWidth: 1, borderColor: color.divider, borderRadius: radius.md, padding: 10, fontFamily: bodyFont(lang), fontSize: 14, color: color.text, textAlignVertical: 'top' }}
            />
          </View>

          {error ? <ErrorNote message={error} /> : null}

          <PrimaryButton
            label={t('createJobOrder')}
            loading={createMut.isPending}
            disabled={!canSubmit}
            onPress={() => {
              setError(null);
              createMut.mutate();
            }}
          />
        </View>
      </View>
    </Modal>
  );
}
