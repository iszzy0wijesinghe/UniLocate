import ApartmentRoundedIcon from '@mui/icons-material/ApartmentRounded';
import ReportProblemRoundedIcon from '@mui/icons-material/ReportProblemRounded';
import GroupRoundedIcon from '@mui/icons-material/GroupRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import {
  Alert,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { StatCard } from '../components/common/StatCard';
import { getDashboardSummary, getOccupancyZones, type DashboardSummary } from '../services/dashboard.service';

type OccupancyZone = {
  id: string;
  name: string;
  display_name?: string;
  current_count?: number;
  capacity?: number;
  status?: string;
};

export function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [zones, setZones] = useState<OccupancyZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [summaryData, zonesData] = await Promise.all([
          getDashboardSummary(),
          getOccupancyZones(),
        ]);

        setSummary(summaryData);
        setZones(zonesData ?? []);
        setError(null);
      } catch (err) {
        console.error(err);
        setError('Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const liveAlerts = useMemo(() => {
    return zones
      .filter((zone) => ['Crowded', 'Almost Full'].includes(zone.status ?? ''))
      .slice(0, 5)
      .map((zone) => ({
        title: `${zone.display_name || zone.name} is ${zone.status}`,
        subtitle: `${zone.current_count ?? 0} / ${zone.capacity ?? 0} people`,
      }));
  }, [zones]);

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Real-time UniLocate operational overview for campus admins."
      />

      {loading ? (
        <Stack alignItems="center" sx={{ py: 8 }}>
          <CircularProgress />
        </Stack>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : (
        <Grid container spacing={2.5}>
          <Grid size={{ xs: 12, md: 6, xl: 3 }}>
            <StatCard
              label="Total Buildings"
              value={summary?.totalBuildings ?? 0}
              helper={`${summary?.warningBuildings ?? 0} near threshold`}
              icon={<ApartmentRoundedIcon color="primary" />}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6, xl: 3 }}>
            <StatCard
              label="Active Complaints"
              value={summary?.activeComplaints ?? 0}
              helper={`${summary?.totalComplaints ?? 0} total complaint cases`}
              icon={<ReportProblemRoundedIcon color="warning" />}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6, xl: 3 }}>
            <StatCard
              label="Lost Item Reports Today"
              value={summary?.lostItemReportsToday ?? 0}
              helper={`${summary?.lostPosts ?? 0} lost / ${summary?.foundPosts ?? 0} found`}
              icon={<Inventory2RoundedIcon color="secondary" />}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6, xl: 3 }}>
            <StatCard
              label="Total Users"
              value={summary?.totalUsers ?? 0}
              helper={`${summary?.overcrowdedBuildings ?? 0} overcrowded buildings`}
              icon={<GroupRoundedIcon color="success" />}
            />
          </Grid>

          <Grid size={{ xs: 12, lg: 8 }}>
            <Card sx={{ minHeight: 360 }}>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                  <WarningAmberRoundedIcon color="warning" />
                  <Typography variant="h6">Operational Snapshot</Typography>
                </Stack>

                <Typography color="text.secondary" sx={{ mb: 3 }}>
                  This section is now using live data from the shared mobile-app database.
                </Typography>

                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Card variant="outlined" sx={{ borderRadius: 4 }}>
                      <CardContent>
                        <Typography fontWeight={700}>Overcrowded Buildings</Typography>
                        <Typography variant="h3" sx={{ mt: 1 }}>
                          {summary?.overcrowdedBuildings ?? 0}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid size={{ xs: 12, md: 6 }}>
                    <Card variant="outlined" sx={{ borderRadius: 4 }}>
                      <CardContent>
                        <Typography fontWeight={700}>Lost & Found Posts</Typography>
                        <Typography variant="h3" sx={{ mt: 1 }}>
                          {summary?.totalLostFoundPosts ?? 0}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, lg: 4 }}>
            <Card sx={{ minHeight: 360 }}>
              <CardContent>
                <Typography variant="h6">Live Alerts</Typography>

                {liveAlerts.length === 0 ? (
                  <Typography color="text.secondary" sx={{ mt: 2 }}>
                    No live occupancy alerts right now.
                  </Typography>
                ) : (
                  <List disablePadding sx={{ mt: 2 }}>
                    {liveAlerts.map((alert, index) => (
                      <ListItem disableGutters key={`${alert.title}-${index}`}>
                        <ListItemText primary={alert.title} secondary={alert.subtitle} />
                      </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </>
  );
}