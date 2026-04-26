import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ErrorRoundedIcon from '@mui/icons-material/ErrorRounded';
import InfoRoundedIcon from '@mui/icons-material/InfoRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { Box, IconButton, Slide, Stack, Typography } from '@mui/material';
import { useEffect } from 'react';
import { useToastStore, type ToastSeverity } from '../../store/useToastStore';

function getToastStyles(severity: ToastSeverity) {
  if (severity === 'success') {
    return {
      icon: <CheckCircleRoundedIcon fontSize="small" />,
      accent: '#16A34A',
      softBg: '#F0FDF4',
      iconBg: '#DCFCE7',
      iconColor: '#15803D',
      titleColor: '#166534',
    };
  }

  if (severity === 'error') {
    return {
      icon: <ErrorRoundedIcon fontSize="small" />,
      accent: '#DC2626',
      softBg: '#FEF2F2',
      iconBg: '#FEE2E2',
      iconColor: '#B91C1C',
      titleColor: '#991B1B',
    };
  }

  if (severity === 'warning') {
    return {
      icon: <WarningAmberRoundedIcon fontSize="small" />,
      accent: '#D97706',
      softBg: '#FFF7ED',
      iconBg: '#FFEDD5',
      iconColor: '#C2410C',
      titleColor: '#9A3412',
    };
  }

  return {
    icon: <InfoRoundedIcon fontSize="small" />,
    accent: '#2563EB',
    softBg: '#EFF6FF',
    iconBg: '#DBEAFE',
    iconColor: '#1D4ED8',
    titleColor: '#1E40AF',
  };
}

export function ToastViewport() {
  const { toasts, removeToast } = useToastStore();

  useEffect(() => {
    const timers = toasts.map((toast) =>
      window.setTimeout(() => removeToast(toast.id), 3600),
    );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [toasts, removeToast]);

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 18,
        right: 18,
        zIndex: 2200,
        width: 360,
        maxWidth: 'calc(100vw - 24px)',
        pointerEvents: 'none',
      }}
    >
      <Stack spacing={1}>
        {toasts.map((toast) => {
          const styles = getToastStyles(toast.severity);

          return (
            <Slide key={toast.id} direction="left" in mountOnEnter unmountOnExit>
              <Box
                sx={{
                  pointerEvents: 'auto',
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: 0.7,
                  bgcolor: '#FFFFFF',
                  border: '1px solid rgba(15, 23, 42, 0.08)',
                  boxShadow: '0 12px 28px rgba(15, 23, 42, 0.14)',
                }}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    bottom: 0,
                    width: 4,
                    bgcolor: styles.accent,
                  }}
                />

                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr auto',
                    gap: 1.25,
                    alignItems: 'start',
                    px: 1.5,
                    py: 1.25,
                  }}
                >
                  <Box
                    sx={{
                      width: 30,
                      height: 30,
                      mt: 0.15,
                      borderRadius: 1,
                      display: 'grid',
                      placeItems: 'center',
                      bgcolor: styles.iconBg,
                      color: styles.iconColor,
                      flexShrink: 0,
                    }}
                  >
                    {styles.icon}
                  </Box>

                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      sx={{
                        fontSize: 14,
                        fontWeight: 800,
                        color: styles.titleColor,
                        lineHeight: 1.2,
                        mb: 0.25,
                      }}
                    >
                      {toast.title || 'Notification'}
                    </Typography>

                    <Typography
                      sx={{
                        fontSize: 13,
                        color: '#475569',
                        lineHeight: 1.4,
                        wordBreak: 'break-word',
                      }}
                    >
                      {toast.message}
                    </Typography>
                  </Box>

                  <IconButton
                    size="small"
                    onClick={() => removeToast(toast.id)}
                    sx={{
                      mt: -0.25,
                      mr: -0.5,
                      color: '#64748B',
                    }}
                  >
                    <CloseRoundedIcon fontSize="small" />
                  </IconButton>
                </Box>

                <Box sx={{ height: 2, bgcolor: styles.softBg }}>
                  <Box
                    sx={{
                      height: '100%',
                      width: '100%',
                      bgcolor: styles.accent,
                      transformOrigin: 'left center',
                      animation: 'toastShrink 3.6s linear forwards',
                    }}
                  />
                </Box>
              </Box>
            </Slide>
          );
        })}
      </Stack>

      <style>
        {`
          @keyframes toastShrink {
            from { transform: scaleX(1); }
            to { transform: scaleX(0); }
          }
        `}
      </style>
    </Box>
  );
}