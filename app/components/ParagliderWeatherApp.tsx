"use client";

import AirIcon from "@mui/icons-material/Air";
import CloudIcon from "@mui/icons-material/Cloud";
import DeviceThermostatIcon from "@mui/icons-material/DeviceThermostat";
import ExploreIcon from "@mui/icons-material/Explore";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import PlaceIcon from "@mui/icons-material/Place";
import RefreshIcon from "@mui/icons-material/Refresh";
import SpeedIcon from "@mui/icons-material/Speed";
import ThunderstormIcon from "@mui/icons-material/Thunderstorm";
import VisibilityIcon from "@mui/icons-material/Visibility";
import WaterDropIcon from "@mui/icons-material/WaterDrop";
import WbSunnyIcon from "@mui/icons-material/WbSunny";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  CssBaseline,
  Divider,
  LinearProgress,
  Paper,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  TextField,
  ThemeProvider,
  Tooltip,
  Typography,
  createTheme,
} from "@mui/material";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import {
  CurrentSnapshot,
  DayForecast,
  FlightVerdict,
  LocationChoice,
  WeatherSample,
  dateForOffset,
  fetchCurrentSnapshot,
  fetchDayForecast,
  formatDateLabel,
  formatTime,
  numberLabel,
  percentLabel,
  searchLocations,
  statusColor,
  windDirectionLabel,
} from "../lib/weather";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#0f766e",
    },
    secondary: {
      main: "#b45309",
    },
    error: {
      main: "#b91c1c",
    },
    success: {
      main: "#15803d",
    },
    warning: {
      main: "#b45309",
    },
    background: {
      default: "#f5f7f4",
      paper: "#ffffff",
    },
    text: {
      primary: "#17201d",
      secondary: "#53605b",
    },
  },
  shape: {
    borderRadius: 8,
  },
  typography: {
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h1: {
      fontSize: "2.45rem",
      lineHeight: 1.08,
      fontWeight: 760,
    },
    h2: {
      fontSize: "1.55rem",
      lineHeight: 1.18,
      fontWeight: 720,
    },
    h3: {
      fontSize: "1.15rem",
      fontWeight: 700,
    },
    button: {
      textTransform: "none",
      fontWeight: 700,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
  },
});

export default function ParagliderWeatherApp() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: 1000 * 60 * 8,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ParagliderWeatherDashboard />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function ParagliderWeatherDashboard() {
  const [location, setLocation] = useState<LocationChoice | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [locating, setLocating] = useState(false);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationNotice(
        "Browser location is unavailable. Search for a launch area or town to begin.",
      );
      setLocation(null);
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({
          id: `gps-${latitude.toFixed(4)}-${longitude.toFixed(4)}`,
          name: "Current location",
          detail: `${latitude.toFixed(3)}, ${longitude.toFixed(3)}`,
          latitude,
          longitude,
          source: "gps",
        });
        setLocationNotice(null);
        setActiveTab(0);
        setLocating(false);
      },
      () => {
        setLocationNotice(
          "Location permission was not available. Search for a launch area or town to begin.",
        );
        setLocation(null);
        setActiveTab(0);
        setLocating(false);
      },
      {
        enableHighAccuracy: false,
        maximumAge: 1000 * 60 * 10,
        timeout: 10000,
      },
    );
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(requestLocation, 0);
    return () => window.clearTimeout(timer);
  }, [requestLocation]);

  const currentQuery = useQuery({
    queryKey: ["current-weather", location?.latitude, location?.longitude],
    queryFn: () => fetchCurrentSnapshot(location as LocationChoice),
    enabled: Boolean(location),
    refetchInterval: 1000 * 60 * 12,
  });

  const searchQuery = useQuery({
    queryKey: ["location-search", searchText],
    queryFn: () => searchLocations(searchText),
    enabled: searchText.trim().length >= 3,
    staleTime: 1000 * 60 * 20,
  });

  const activeSnapshot = currentQuery.data;
  const sourceChips = activeSnapshot?.sources ?? [
    "Open-Meteo Forecast",
    "Open-Meteo Air Quality",
    "Open-Meteo Geocoding",
  ];

  return (
    <Box
      component="main"
      sx={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 12% 8%, rgba(15, 118, 110, 0.16), transparent 28%), linear-gradient(180deg, #eef4ef 0%, #f7f7f2 48%, #e7eee9 100%)",
      }}
    >
      <Box
        sx={{
          mx: "auto",
          maxWidth: 1260,
          px: { xs: 2, md: 3 },
          py: { xs: 2, md: 3 },
        }}
      >
        <Stack spacing={2.25}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, md: 2.5 },
              border: "1px solid rgba(23, 32, 29, 0.1)",
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.96), rgba(244,248,245,0.92))",
            }}
          >
            <Box
              sx={{
                display: "grid",
                gap: 2,
                gridTemplateColumns: { xs: "1fr", lg: "1.1fr 0.9fr" },
                alignItems: "center",
              }}
            >
              <Stack spacing={1.25}>
                <Stack
                  direction="row"
                  spacing={1}
                  useFlexGap
                  sx={{ flexWrap: "wrap" }}
                >
                  {sourceChips.map((source) => (
                    <Chip key={source} size="small" label={source} />
                  ))}
                </Stack>
                <Typography variant="h1">Paraglider weather check</Typography>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1}
                  sx={{ alignItems: { xs: "stretch", sm: "center" } }}
                >
                  <LocationSummary location={location} snapshot={activeSnapshot} />
                  <Tooltip title="Use current browser location">
                    <span>
                      <Button
                        variant="contained"
                        startIcon={
                          locating ? (
                            <CircularProgress size={18} color="inherit" />
                          ) : (
                            <MyLocationIcon />
                          )
                        }
                        onClick={requestLocation}
                        disabled={locating}
                      >
                        Locate me
                      </Button>
                    </span>
                  </Tooltip>
                  <Tooltip title="Refresh current weather">
                    <span>
                      <Button
                        variant="outlined"
                        startIcon={<RefreshIcon />}
                        onClick={() => currentQuery.refetch()}
                        disabled={!location || currentQuery.isFetching}
                      >
                        Refresh
                      </Button>
                    </span>
                  </Tooltip>
                </Stack>
              </Stack>

              <Autocomplete
                fullWidth
                filterOptions={(options) => options}
                getOptionLabel={(option) =>
                  typeof option === "string"
                    ? option
                    : [option.name, option.detail].filter(Boolean).join(", ")
                }
                inputValue={searchText}
                loading={searchQuery.isFetching}
                onChange={(_, nextValue) => {
                  if (nextValue && typeof nextValue !== "string") {
                    setLocation(nextValue);
                    setLocationNotice(null);
                    setActiveTab(0);
                    setSearchText("");
                  }
                }}
                onInputChange={(_, nextValue) => setSearchText(nextValue)}
                options={searchQuery.data ?? []}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Search launch area or town"
                    placeholder="Annecy, Interlaken, Boulder..."
                  />
                )}
              />
            </Box>
          </Paper>

          {location && locationNotice ? (
            <Alert severity="warning">{locationNotice}</Alert>
          ) : null}

          {location ? (
            <Paper
              elevation={0}
              sx={{
                border: "1px solid rgba(23, 32, 29, 0.1)",
                overflow: "hidden",
              }}
            >
              <Tabs
                value={activeTab}
                onChange={(_, nextValue) => setActiveTab(nextValue)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                  borderBottom: "1px solid rgba(23, 32, 29, 0.1)",
                  px: 1,
                }}
              >
                <Tab label="Now" value={0} />
                {[1, 2, 3].map((offset) => (
                  <Tab
                    key={offset}
                    label={formatDateLabel(dateForOffset(offset))}
                    value={offset}
                  />
                ))}
              </Tabs>

              <Box sx={{ p: { xs: 2, md: 2.5 } }}>
                {activeTab === 0 ? (
                  <CurrentPanel
                    queryError={currentQuery.error}
                    snapshot={currentQuery.data}
                    isLoading={currentQuery.isLoading || locating}
                    isFetching={currentQuery.isFetching}
                  />
                ) : null}

                {[1, 2, 3].map((offset) => (
                  <ForecastPanel
                    key={offset}
                    active={activeTab === offset}
                    location={location}
                    offset={offset}
                  />
                ))}
              </Box>
            </Paper>
          ) : (
            <EmptyLocationPanel
              locating={locating}
              notice={locationNotice}
              onLocate={requestLocation}
            />
          )}
        </Stack>
      </Box>
    </Box>
  );
}

function LocationSummary({
  location,
  snapshot,
}: {
  location: LocationChoice | null;
  snapshot?: CurrentSnapshot;
}) {
  if (!location) {
    return (
      <Chip
        icon={<PlaceIcon />}
        label="No location selected"
        sx={{ justifyContent: "flex-start", maxWidth: "100%" }}
      />
    );
  }

  const detail = snapshot?.timezone ?? location.detail;

  return (
    <Chip
      icon={<PlaceIcon />}
      label={[location.name, detail].filter(Boolean).join(" - ")}
      sx={{ justifyContent: "flex-start", maxWidth: "100%" }}
    />
  );
}

function EmptyLocationPanel({
  locating,
  notice,
  onLocate,
}: {
  locating: boolean;
  notice: string | null;
  onLocate: () => void;
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        position: "relative",
        overflow: "hidden",
        border: "1px solid rgba(23, 32, 29, 0.1)",
        background:
          "linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(232,244,238,0.96) 48%, rgba(244,235,220,0.92) 100%)",
      }}
    >
      <Box
        sx={{
          display: "grid",
          gap: { xs: 1.5, md: 3 },
          gridTemplateColumns: { xs: "1fr", md: "0.95fr 1.05fr" },
          alignItems: "center",
          minHeight: { xs: 560, md: 500 },
          p: { xs: 2.25, md: 4 },
        }}
      >
        <Stack
          spacing={2.2}
          sx={{
            maxWidth: 520,
            zIndex: 1,
            order: { xs: 2, md: 1 },
          }}
        >
          <Chip
            icon={<ExploreIcon />}
            label="Ready when you pick a site"
            sx={{
              alignSelf: "flex-start",
              background: "rgba(15, 118, 110, 0.1)",
              color: "primary.main",
              fontWeight: 800,
            }}
          />
          <Stack spacing={1}>
            <Typography variant="h2" sx={{ fontSize: { xs: "1.8rem", md: "2.25rem" } }}>
              Choose a location to start the flight check
            </Typography>
            <Typography color="text.secondary" sx={{ fontSize: "1rem", lineHeight: 1.7 }}>
              Search for a launch area, town, or postal code, or let the browser
              use your current position. Weather data and the three-day flying
              readout will appear after a location is selected.
            </Typography>
          </Stack>
          {notice ? (
            <Alert severity="info" sx={{ background: "rgba(255, 255, 255, 0.78)" }}>
              {notice}
            </Alert>
          ) : null}
          <Box
            sx={{
              display: "grid",
              gap: 1,
              gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
            }}
          >
            <InstructionStep
              number="1"
              title="Search"
              body="Type at least three characters in the location field."
            />
            <InstructionStep
              number="2"
              title="Select"
              body="Pick the closest town or launch area from the list."
            />
            <InstructionStep
              number="3"
              title="Compare"
              body="Open tomorrow's tabs when you want their forecasts."
            />
          </Box>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            sx={{ alignItems: { xs: "stretch", sm: "center" } }}
          >
            <Button
              variant="contained"
              startIcon={
                locating ? <CircularProgress size={18} color="inherit" /> : <MyLocationIcon />
              }
              onClick={onLocate}
              disabled={locating}
            >
              Use my location
            </Button>
            <Typography variant="body2" color="text.secondary">
              Location stays in your browser session and is sent only to the
              weather APIs for the forecast.
            </Typography>
          </Stack>
        </Stack>

        <Box
          sx={{
            minHeight: { xs: 260, md: 420 },
            position: "relative",
            order: { xs: 1, md: 2 },
          }}
        >
          <ParagliderEmptyAnimation />
        </Box>
      </Box>
    </Paper>
  );
}

function InstructionStep({
  number,
  title,
  body,
}: {
  number: string;
  title: string;
  body: string;
}) {
  return (
    <Box
      sx={{
        border: "1px solid rgba(23, 32, 29, 0.1)",
        borderRadius: 1,
        p: 1.25,
        background: "rgba(255, 255, 255, 0.72)",
        minHeight: 126,
      }}
    >
      <Stack spacing={0.75}>
        <Box
          sx={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            background: "#0f766e",
            color: "#ffffff",
            fontWeight: 900,
          }}
        >
          {number}
        </Box>
        <Typography sx={{ fontWeight: 850 }}>{title}</Typography>
        <Typography variant="body2" color="text.secondary">
          {body}
        </Typography>
      </Stack>
    </Box>
  );
}

function ParagliderEmptyAnimation() {
  return (
    <Box
      aria-hidden="true"
      sx={{
        position: "absolute",
        inset: 0,
        display: "grid",
        placeItems: "center",
        "@keyframes glide": {
          "0%, 100%": { transform: "translate3d(-12px, 2px, 0) rotate(-1deg)" },
          "50%": { transform: "translate3d(12px, -12px, 0) rotate(1deg)" },
        },
        "@keyframes wingPulse": {
          "0%, 100%": { transform: "scaleX(1)" },
          "50%": { transform: "scaleX(1.025)" },
        },
        "@keyframes drift": {
          "0%": { transform: "translateX(-28px)", opacity: 0 },
          "18%": { opacity: 0.56 },
          "78%": { opacity: 0.56 },
          "100%": { transform: "translateX(34px)", opacity: 0 },
        },
        "@keyframes thermal": {
          "0%": { transform: "translateY(18px) scale(0.9)", opacity: 0 },
          "25%": { opacity: 0.42 },
          "100%": { transform: "translateY(-54px) scale(1.14)", opacity: 0 },
        },
      }}
    >
      <Box
        component="svg"
        viewBox="0 0 640 460"
        role="img"
        sx={{
          width: "min(100%, 620px)",
          height: "auto",
          maxHeight: 430,
          filter: "drop-shadow(0 24px 34px rgba(23, 32, 29, 0.12))",
        }}
      >
        <defs>
          <linearGradient id="sky-glow" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#e4f3ee" />
            <stop offset="52%" stopColor="#f8f3e8" />
            <stop offset="100%" stopColor="#d9ebe5" />
          </linearGradient>
          <linearGradient id="wing" x1="0" x2="1">
            <stop offset="0%" stopColor="#0f766e" />
            <stop offset="48%" stopColor="#22a08f" />
            <stop offset="100%" stopColor="#c7772b" />
          </linearGradient>
          <linearGradient id="mountain" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#63736c" />
            <stop offset="100%" stopColor="#24342f" />
          </linearGradient>
        </defs>

        <rect width="640" height="460" rx="24" fill="url(#sky-glow)" />
        <circle cx="482" cy="104" r="48" fill="#f5c66f" opacity="0.8" />
        <path
          d="M0 356 L108 242 L170 306 L232 214 L314 330 L380 256 L470 352 L640 272 L640 460 L0 460 Z"
          fill="url(#mountain)"
          opacity="0.24"
        />
        <path
          d="M0 388 L112 300 L214 370 L314 276 L436 392 L548 328 L640 376 L640 460 L0 460 Z"
          fill="#0f2924"
          opacity="0.18"
        />

        {[108, 232, 430].map((x, index) => (
          <g
            key={x}
            style={{
              animation: `drift ${8 + index * 1.5}s ease-in-out ${index * 0.7}s infinite`,
            }}
          >
            <path
              d={`M${x} 122 C${x + 20} 98 ${x + 54} 98 ${x + 74} 122 C${x + 96} 120 ${x + 112} 132 ${x + 116} 150 L${x - 18} 150 C${x - 18} 134 ${x - 6} 124 ${x} 122 Z`}
              fill="#ffffff"
              opacity="0.78"
            />
          </g>
        ))}

        {[250, 306, 362].map((x, index) => (
          <path
            key={x}
            d={`M${x} 382 C${x - 20} 338 ${x + 20} 314 ${x} 272`}
            fill="none"
            stroke="#0f766e"
            strokeDasharray="8 12"
            strokeLinecap="round"
            strokeWidth="3"
            opacity="0.28"
            style={{
              animation: `thermal ${4.6 + index * 0.55}s ease-out ${index * 0.65}s infinite`,
            }}
          />
        ))}

        <g style={{ animation: "glide 5.8s ease-in-out infinite" }}>
          <g style={{ transformOrigin: "320px 168px", animation: "wingPulse 2.8s ease-in-out infinite" }}>
            <path
              d="M128 168 C176 78 462 78 512 168 C428 138 236 138 128 168 Z"
              fill="url(#wing)"
            />
            <path
              d="M166 152 C220 124 418 124 476 152"
              fill="none"
              stroke="#ffffff"
              strokeLinecap="round"
              strokeWidth="8"
              opacity="0.48"
            />
            <path
              d="M128 168 C236 148 428 148 512 168"
              fill="none"
              stroke="#17201d"
              strokeOpacity="0.18"
              strokeWidth="5"
            />
          </g>

          <path
            d="M238 162 L292 268 M402 162 L348 268"
            stroke="#53605b"
            strokeLinecap="round"
            strokeWidth="2"
            opacity="0.72"
          />
          <path
            d="M274 164 L306 260 M366 164 L334 260"
            stroke="#53605b"
            strokeLinecap="round"
            strokeWidth="1.5"
            opacity="0.56"
          />
          <ellipse cx="320" cy="286" rx="34" ry="13" fill="#17201d" opacity="0.88" />
          <path
            d="M292 282 C310 258 333 258 350 282"
            fill="none"
            stroke="#17201d"
            strokeLinecap="round"
            strokeWidth="9"
          />
          <circle cx="320" cy="255" r="13" fill="#c7772b" />
          <path
            d="M304 276 L286 300 M336 276 L358 298"
            stroke="#17201d"
            strokeLinecap="round"
            strokeWidth="8"
          />
          <path
            d="M242 314 C290 334 352 334 402 314"
            fill="none"
            stroke="#0f766e"
            strokeLinecap="round"
            strokeWidth="5"
            opacity="0.38"
          />
        </g>
      </Box>
    </Box>
  );
}

function CurrentPanel({
  snapshot,
  isLoading,
  isFetching,
  queryError,
}: {
  snapshot?: CurrentSnapshot;
  isLoading: boolean;
  isFetching: boolean;
  queryError: Error | null;
}) {
  if (queryError) {
    return (
      <Alert severity="error">
        Current weather could not be loaded: {queryError.message}
      </Alert>
    );
  }

  if (isLoading || !snapshot) {
    return <DashboardSkeleton />;
  }

  return (
    <Stack spacing={2.25}>
      {isFetching ? <LinearProgress color="primary" /> : null}
      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr", lg: "0.95fr 1.05fr" },
        }}
      >
        <FlightVerdictCard
          verdict={snapshot.verdict}
          sample={snapshot.sample}
          timezone={snapshot.timezone}
          title="Current flying conclusion"
        />
        <CurrentConditionsCard snapshot={snapshot} />
      </Box>
      <MetricGrid sample={snapshot.sample} />
    </Stack>
  );
}

function CurrentConditionsCard({ snapshot }: { snapshot: CurrentSnapshot }) {
  const { sample } = snapshot;

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        border: "1px solid rgba(23, 32, 29, 0.1)",
        height: "100%",
      }}
    >
      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr", sm: "180px 1fr" },
          alignItems: "center",
        }}
      >
        <WindDial sample={sample} />
        <Stack spacing={1.25}>
          <Typography variant="h2">{sample.weatherLabel}</Typography>
          <Typography color="text.secondary">
            Updated {formatTime(sample.time, snapshot.timezone)} local time
          </Typography>
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
            <Chip
              icon={<DeviceThermostatIcon />}
              label={numberLabel(sample.temperature, "C", 1)}
            />
            <Chip icon={<AirIcon />} label={numberLabel(sample.windSpeed, "km/h")} />
            <Chip
              icon={<ExploreIcon />}
              label={`${windDirectionLabel(sample.windDirection)} wind`}
            />
            <Chip
              icon={<SpeedIcon />}
              label={`${numberLabel(sample.windGusts, "km/h")} gusts`}
            />
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Elevation {numberLabel(snapshot.elevation, "m")} model grid. Use the
            launch-site reading if ridge or valley flow disagrees.
          </Typography>
        </Stack>
      </Box>
    </Paper>
  );
}

function ForecastPanel({
  active,
  location,
  offset,
}: {
  active: boolean;
  location: LocationChoice | null;
  offset: number;
}) {
  const date = useMemo(() => dateForOffset(offset), [offset]);
  const forecastQuery = useQuery({
    queryKey: ["day-forecast", location?.latitude, location?.longitude, date],
    queryFn: () => fetchDayForecast(location as LocationChoice, date),
    enabled: active && Boolean(location),
  });

  if (!active) {
    return null;
  }

  if (!location) {
    return <Alert severity="info">Choose a location to load this forecast.</Alert>;
  }

  if (forecastQuery.error) {
    return (
      <Alert severity="error">
        Forecast could not be loaded: {forecastQuery.error.message}
      </Alert>
    );
  }

  if (forecastQuery.isLoading || !forecastQuery.data) {
    return <DashboardSkeleton />;
  }

  return <DayForecastView forecast={forecastQuery.data} />;
}

function DayForecastView({ forecast }: { forecast: DayForecast }) {
  const bestSample = forecast.best.sample;

  return (
    <Stack spacing={2.25}>
      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr", lg: "0.95fr 1.05fr" },
        }}
      >
        <FlightVerdictCard
          verdict={forecast.best.verdict}
          sample={bestSample}
          timezone={forecast.timezone}
          title={`${formatDateLabel(forecast.date)} best window`}
        />
        <Paper
          elevation={0}
          sx={{ p: 2, border: "1px solid rgba(23, 32, 29, 0.1)" }}
        >
          <Stack spacing={1.5}>
            <Typography variant="h2">{forecast.daily.weatherLabel}</Typography>
            <Box
              sx={{
                display: "grid",
                gap: 1,
                gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" },
              }}
            >
              <MiniMetric
                label="Temp range"
                value={`${numberLabel(forecast.daily.temperatureMin, "C")} / ${numberLabel(
                  forecast.daily.temperatureMax,
                  "C",
                )}`}
              />
              <MiniMetric
                label="Wind max"
                value={numberLabel(forecast.daily.windSpeedMax, "km/h")}
              />
              <MiniMetric
                label="Gust max"
                value={numberLabel(forecast.daily.windGustsMax, "km/h")}
              />
              <MiniMetric
                label="Rain risk"
                value={percentLabel(forecast.daily.precipitationProbabilityMax)}
              />
              <MiniMetric
                label="Rain sum"
                value={numberLabel(forecast.daily.precipitationSum, "mm", 1)}
              />
              <MiniMetric
                label="UV max"
                value={numberLabel(forecast.daily.uvIndexMax, "", 1)}
              />
              <MiniMetric
                label="Sunrise"
                value={formatTime(forecast.daily.sunrise, forecast.timezone)}
              />
              <MiniMetric
                label="Sunset"
                value={formatTime(forecast.daily.sunset, forecast.timezone)}
              />
            </Box>
          </Stack>
        </Paper>
      </Box>

      {bestSample ? <MetricGrid sample={bestSample} /> : null}

      <Paper
        elevation={0}
        sx={{ p: 2, border: "1px solid rgba(23, 32, 29, 0.1)" }}
      >
        <Stack spacing={1.5}>
          <Typography variant="h3">Candidate windows</Typography>
          {forecast.topWindows.length === 0 ? (
            <Alert severity="warning">
              No daylight hour clears the conservative wind, weather, and
              visibility gates.
            </Alert>
          ) : (
            <Stack spacing={1}>
              {forecast.topWindows.map(({ sample, verdict }) => (
                <Box
                  key={sample.time}
                  sx={{
                    display: "grid",
                    gap: 1,
                    gridTemplateColumns: { xs: "1fr", md: "120px 1fr 1fr 1fr" },
                    alignItems: "center",
                    border: "1px solid rgba(23, 32, 29, 0.1)",
                    borderRadius: 1,
                    p: 1.25,
                  }}
                >
                  <Typography sx={{ fontWeight: 800 }}>
                    {formatTime(sample.time, forecast.timezone)}
                  </Typography>
                  <Chip
                    label={`${verdict.title} - ${verdict.score}/100`}
                    sx={{
                      color: statusColor(verdict.status),
                      borderColor: statusColor(verdict.status),
                    }}
                    variant="outlined"
                  />
                  <Typography color="text.secondary">
                    Wind {numberLabel(sample.windSpeed, "km/h")} / gust{" "}
                    {numberLabel(sample.windGusts, "km/h")}
                  </Typography>
                  <Typography color="text.secondary">
                    {sample.weatherLabel}, rain {percentLabel(sample.precipitationProbability)}
                  </Typography>
                </Box>
              ))}
            </Stack>
          )}
        </Stack>
      </Paper>
    </Stack>
  );
}

function FlightVerdictCard({
  verdict,
  sample,
  timezone,
  title,
}: {
  verdict: FlightVerdict;
  sample: WeatherSample | null;
  timezone: string;
  title: string;
}) {
  const color = statusColor(verdict.status);

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        border: "1px solid rgba(23, 32, 29, 0.1)",
        borderLeft: `6px solid ${color}`,
        height: "100%",
      }}
    >
      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr", sm: "132px 1fr" },
          alignItems: "center",
        }}
      >
        <Box
          sx={{
            position: "relative",
            width: 116,
            height: 116,
            mx: { xs: 0, sm: "auto" },
          }}
        >
          <CircularProgress
            variant="determinate"
            value={100}
            size={116}
            thickness={4}
            sx={{ color: "rgba(23, 32, 29, 0.12)", position: "absolute" }}
          />
          <CircularProgress
            variant="determinate"
            value={verdict.score}
            size={116}
            thickness={4}
            sx={{ color }}
          />
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
            }}
          >
            <Typography variant="h2" sx={{ color }}>
              {verdict.score}
            </Typography>
          </Box>
        </Box>
        <Stack spacing={1.2}>
          <Typography color="text.secondary" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
          <Typography variant="h2" sx={{ color }}>
            {verdict.title}
          </Typography>
          {sample ? (
            <Typography color="text.secondary">
              Local sample {formatTime(sample.time, timezone)}
            </Typography>
          ) : null}
          <Stack spacing={0.75}>
            {verdict.reasons.slice(0, 4).map((reason) => (
              <Stack
                key={reason}
                direction="row"
                spacing={0.75}
                sx={{ alignItems: "flex-start" }}
              >
                <WarningAmberIcon sx={{ color, fontSize: 18, mt: "2px" }} />
                <Typography variant="body2">{reason}</Typography>
              </Stack>
            ))}
          </Stack>
          <Divider />
          <Typography variant="body2" color="text.secondary">
            Decision aid only. Confirm site rules, actual launch wind, rotor,
            overdevelopment, terrain, and your pilot limits before flying.
          </Typography>
        </Stack>
      </Box>
    </Paper>
  );
}

function MetricGrid({ sample }: { sample: WeatherSample }) {
  const gustSpread =
    sample.windSpeed !== null && sample.windGusts !== null
      ? sample.windGusts - sample.windSpeed
      : null;

  const metrics = [
    {
      label: "Wind",
      value: numberLabel(sample.windSpeed, "km/h"),
      detail: `${windDirectionLabel(sample.windDirection)} at 10 m`,
      icon: <AirIcon />,
    },
    {
      label: "Gust spread",
      value: numberLabel(gustSpread, "km/h"),
      detail: `Gusts ${numberLabel(sample.windGusts, "km/h")}`,
      icon: <SpeedIcon />,
    },
    {
      label: "Precipitation",
      value: numberLabel(sample.precipitation, "mm", 1),
      detail: `Probability ${percentLabel(sample.precipitationProbability)}`,
      icon: <WaterDropIcon />,
    },
    {
      label: "Visibility",
      value:
        sample.visibility === null
          ? "n/a"
          : `${(sample.visibility / 1000).toFixed(1)} km`,
      detail: sample.weatherLabel,
      icon: <VisibilityIcon />,
    },
    {
      label: "Cloud cover",
      value: percentLabel(sample.cloudCover),
      detail: `CAPE ${numberLabel(sample.cape, "J/kg")}`,
      icon: <CloudIcon />,
    },
    {
      label: "Temperature",
      value: numberLabel(sample.temperature, "C", 1),
      detail: `Feels ${numberLabel(sample.apparentTemperature, "C", 1)}`,
      icon: <DeviceThermostatIcon />,
    },
    {
      label: "Pressure",
      value: numberLabel(sample.pressure, "hPa"),
      detail: `Humidity ${percentLabel(sample.humidity)}`,
      icon: <ThunderstormIcon />,
    },
    {
      label: "Air and sun",
      value:
        sample.usAqi === null
          ? `UV ${numberLabel(sample.uvIndex, "", 1)}`
          : `AQI ${Math.round(sample.usAqi)}`,
      detail: `PM2.5 ${numberLabel(sample.pm25, "ug/m3", 1)}`,
      icon: <WbSunnyIcon />,
    },
  ];

  return (
    <Box
      sx={{
        display: "grid",
        gap: 1,
        gridTemplateColumns: {
          xs: "1fr",
          sm: "repeat(2, minmax(0, 1fr))",
          lg: "repeat(4, minmax(0, 1fr))",
        },
      }}
    >
      {metrics.map((metric) => (
        <MetricTile key={metric.label} {...metric} />
      ))}
    </Box>
  );
}

function MetricTile({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: ReactNode;
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 1.5,
        border: "1px solid rgba(23, 32, 29, 0.1)",
        minHeight: 116,
      }}
    >
      <Stack spacing={1}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              display: "grid",
              placeItems: "center",
              borderRadius: 1,
              color: "primary.main",
              background: "rgba(15, 118, 110, 0.1)",
            }}
          >
            {icon}
          </Box>
          <Typography sx={{ fontWeight: 800 }}>{label}</Typography>
        </Stack>
        <Typography variant="h3">{value}</Typography>
        <Typography variant="body2" color="text.secondary">
          {detail}
        </Typography>
      </Stack>
    </Paper>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <Box
      sx={{
        border: "1px solid rgba(23, 32, 29, 0.1)",
        borderRadius: 1,
        p: 1.25,
        minHeight: 76,
      }}
    >
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography sx={{ fontWeight: 800 }}>{value}</Typography>
    </Box>
  );
}

function WindDial({ sample }: { sample: WeatherSample }) {
  const rotation = sample.windDirection ?? 0;
  const color = statusColor(
    sample.windSpeed !== null && sample.windSpeed >= 8 && sample.windSpeed <= 22
      ? "good"
      : "marginal",
  );

  return (
    <Box
      sx={{
        width: 168,
        height: 168,
        borderRadius: "50%",
        border: "1px solid rgba(23, 32, 29, 0.16)",
        background:
          "conic-gradient(from 0deg, rgba(15,118,110,0.18), rgba(180,83,9,0.14), rgba(15,118,110,0.18))",
        position: "relative",
        display: "grid",
        placeItems: "center",
      }}
    >
      {["N", "E", "S", "W"].map((point) => (
        <Typography
          key={point}
          color="text.secondary"
          sx={{
            fontWeight: 800,
            position: "absolute",
            top: point === "N" ? 8 : point === "S" ? "auto" : "50%",
            bottom: point === "S" ? 8 : "auto",
            left: point === "W" ? 10 : point === "E" ? "auto" : "50%",
            right: point === "E" ? 10 : "auto",
            transform:
              point === "N" || point === "S"
                ? "translateX(-50%)"
                : "translateY(-50%)",
          }}
        >
          {point}
        </Typography>
      ))}
      <Box
        sx={{
          width: 8,
          height: 62,
          borderRadius: 4,
          background: color,
          transform: `rotate(${rotation}deg) translateY(-18px)`,
          transformOrigin: "center 54px",
          boxShadow: "0 8px 18px rgba(23, 32, 29, 0.18)",
          "&::before": {
            content: '""',
            display: "block",
            width: 0,
            height: 0,
            borderLeft: "10px solid transparent",
            borderRight: "10px solid transparent",
            borderBottom: `18px solid ${color}`,
            transform: "translate(-6px, -12px)",
          },
        }}
      />
      <Stack spacing={0.25} sx={{ position: "absolute", alignItems: "center" }}>
        <Typography variant="h3">{windDirectionLabel(sample.windDirection)}</Typography>
        <Typography variant="body2" color="text.secondary">
          {numberLabel(sample.windSpeed, "km/h")}
        </Typography>
      </Stack>
    </Box>
  );
}

function DashboardSkeleton() {
  return (
    <Stack spacing={2}>
      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: { xs: "1fr", lg: "0.95fr 1.05fr" },
        }}
      >
        <Skeleton variant="rounded" height={260} />
        <Skeleton variant="rounded" height={260} />
      </Box>
      <Box
        sx={{
          display: "grid",
          gap: 1,
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" },
        }}
      >
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} variant="rounded" height={116} />
        ))}
      </Box>
    </Stack>
  );
}
