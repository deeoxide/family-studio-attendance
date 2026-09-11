import React, { useState } from 'react';
import { View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ScreenContainer } from '@/components/ScreenContainer';
import { Body, Card, EmptyState, GhostButton, Heading, Muted, PrimaryButton, Tag, Toast } from '@/components/ui';
import { NewJobOrderModal } from '@/components/NewJobOrderModal';
import { useLanguage } from '@/state/LanguageContext';
import { jobOrderApi } from '@/api/endpoints';
import type { JobOrder, JobStatus, JobWorkType } from '@/api/types';
import { formatDateShort } from '@/lib/format';

const STATUS_KEY: Record<JobStatus, 'jobStatusOpen' | 'jobStatusInProgress' | 'jobStatusClosed'> = {
  OPEN: 'jobStatusOpen',
  IN_PROGRESS: 'jobStatusInProgress',
  CLOSED: 'jobStatusClosed',
};
const STATUS_VARIANT: Record<JobStatus, 'outline' | 'accent' | 'neutral'> = {
  OPEN: 'outline',
  IN_PROGRESS: 'accent',
  CLOSED: 'neutral',
};
const WORK_TYPE_KEY: Record<JobWorkType, 'workInternal' | 'workExternal'> = {
  INTERNAL: 'workInternal',
  EXTERNAL: 'workExternal',
};

export function JobsScreen() {
  const { lang, t } = useLanguage();
  const qc = useQueryClient();
  const [newOpen, setNewOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const jobsQ = useQuery({ queryKey: ['jobOrders', 'mine'], queryFn: () => jobOrderApi.mine().then((r) => r.jobOrders) });

  const statusMut = useMutation({
    mutationFn: (vars: { id: string; status: JobStatus }) => jobOrderApi.setStatus(vars.id, vars.status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jobOrders'] });
      flash(t('jobUpdated'));
    },
  });

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  }

  const jobs = jobsQ.data ?? [];

  return (
    <ScreenContainer title={t('tabJobs')}>
      <PrimaryButton label={t('newJobOrder')} onPress={() => setNewOpen(true)} />

      {jobs.length === 0 ? (
        <EmptyState title={t('noJobs')} note={t('noJobsNote')} />
      ) : (
        <View style={{ gap: 12 }}>
          {jobs.map((j: JobOrder) => (
            <Card key={j.id}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Heading style={{ fontSize: 15 }}>{j.jobOrderNo}</Heading>
                  {j.project ? <Body style={{ fontSize: 13, marginTop: 2 }}>{j.project}</Body> : null}
                  <Muted style={{ marginTop: 3 }}>{`${j.clientCode} · ${t(WORK_TYPE_KEY[j.workType])}`}</Muted>
                </View>
                <Tag label={t(STATUS_KEY[j.status])} variant={STATUS_VARIANT[j.status]} />
              </View>

              <Body style={{ fontSize: 13, marginTop: 10 }}>{j.task}</Body>

              <Muted style={{ marginTop: 8 }}>
                {`${t('dateOpened')}: ${formatDateShort(j.openDate, lang)}`}
                {j.closeDate ? ` · ${t('dateClosed')}: ${formatDateShort(j.closeDate, lang)}` : ''}
              </Muted>

              {j.status !== 'CLOSED' ? (
                <View style={{ flexDirection: 'row', gap: 18, marginTop: 12 }}>
                  {j.status === 'OPEN' ? (
                    <GhostButton
                      label={t('markInProgress')}
                      onPress={() => statusMut.mutate({ id: j.id, status: 'IN_PROGRESS' })}
                    />
                  ) : null}
                  <GhostButton label={t('closeJob')} onPress={() => statusMut.mutate({ id: j.id, status: 'CLOSED' })} />
                </View>
              ) : (
                <View style={{ marginTop: 12 }}>
                  <GhostButton label={t('reopenJob')} onPress={() => statusMut.mutate({ id: j.id, status: 'OPEN' })} />
                </View>
              )}
            </Card>
          ))}
        </View>
      )}

      <NewJobOrderModal visible={newOpen} onClose={() => setNewOpen(false)} onCreated={flash} />

      {toast ? (
        <View style={{ position: 'absolute', left: 20, right: 20, bottom: 24 }}>
          <Toast message={toast} />
        </View>
      ) : null}
    </ScreenContainer>
  );
}
