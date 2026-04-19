import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import {
  Card,
  CardContent,
  Stack,
  Typography,
} from '@mui/material';
import type { ReactNode } from 'react';

type StatCardProps = {
  label: string;
  value: string | number;
  helper?: string;
  icon?: ReactNode;
};

export function StatCard({ label, value, helper, icon }: StatCardProps) {
  return (
    <Card>
      <CardContent sx={{ p: 2.25 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <div>
            <Typography variant="body2" color="text.secondary" fontWeight={600}>
              {label}
            </Typography>
            <Typography variant="h3" sx={{ mt: 1 }}>
              {value}
            </Typography>
            {helper ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {helper}
              </Typography>
            ) : null}
          </div>
          {icon ?? <TrendingUpRoundedIcon color="primary" />}
        </Stack>
      </CardContent>
    </Card>
  );
}