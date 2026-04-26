import { Chip } from '@mui/material';
import type { OccupancyStatus } from '../../types/buildings';

type Props = {
  status: OccupancyStatus;
};

export function StatusChip({ status }: Props) {
  const config =
    status === 'Crowded'
      ? { label: 'Crowded', sx: { bgcolor: '#FDECEC', color: '#D93025' } }
      : status === 'Almost Full'
        ? { label: 'Almost Full', sx: { bgcolor: '#FFF4E5', color: '#D97706' } }
        : status === 'Available'
          ? { label: 'Available', sx: { bgcolor: '#E7F3FF', color: '#1565C0' } }
          : status === 'Free'
            ? { label: 'Free', sx: { bgcolor: '#E8F7EE', color: '#1E8E5A' } }
            : { label: 'Unknown', sx: { bgcolor: '#EEF2F6', color: '#6B7280' } };

  return (
    <Chip
      label={config.label}
      size="small"
      sx={{
        fontWeight: 700,
        borderRadius: 2,
        ...config.sx,
      }}
    />
  );
}