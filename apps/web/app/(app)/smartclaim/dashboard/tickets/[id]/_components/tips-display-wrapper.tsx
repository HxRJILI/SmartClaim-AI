// apps/web/app/(app)/smartclaim/dashboard/tickets/[id]/_components/tips-display-wrapper.tsx
'use client';

import { TipsDisplay } from '../../../../_components/tips-display';

interface TipsDisplayWrapperProps {
  ticketId: string;
  priority: string;
  category: string;
  title?: string;
  description?: string;
}

export function TipsDisplayWrapper({
  ticketId,
  priority,
  category,
  title,
  description,
}: TipsDisplayWrapperProps) {
  return (
    <TipsDisplay
      ticketId={ticketId}
      priority={priority}
      category={category}
      title={title}
      description={description}
    />
  );
}
