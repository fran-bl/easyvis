import { useEffect, useState, type ChangeEvent } from "react";
import * as Astronomy from "astronomy-engine";
import { makeBodyTarget, Target } from "./astronomy/targets";
import "./index.css";
import { SkyView } from "./components/skyView";
import { Backdrop, Checkbox, CircularProgress, Drawer, FormControlLabel, FormGroup, IconButton, MenuItem, Select, Slider, type SelectChangeEvent, type SliderProps } from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import { VisibilityChart } from "./components/visibilityChart";
import { calculateDay } from "./observation/observation";
import { getLocalDate } from "./astronomy/time";
import { LocationPicker } from "./components/locationPicker";
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from "dayjs";
import type { Location } from "./types";
import { BodyInfo } from "./components/bodyInfo";


const BODIES: string[] = ["Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];

function App() {
  const [dayLoaded, setDayLoaded] = useState(false);
  const [starSphereLoaded, setStarSphereLoaded] = useState(false);
  const isInitialLoad = !(dayLoaded && starSphereLoaded);
  const [target, setTarget] = useState<Target>(() => makeBodyTarget(Astronomy.Body.Moon));
  const [location, setLocation] = useState<Location>({
    lat: 51.500826,
    lng: -0.124534,
    zoom: 8,
  })
  const [selectedDate, setSelectedDate] = useState(() =>
    getLocalDate(location.lat, location.lng),
  );
  const [day, setDay] = useState<Awaited<ReturnType<typeof calculateDay>> | null>(null);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const selectedPoint = day?.points[selectedMinute] ?? null;
  const selectedTime = selectedPoint?.localTime;
  const [follow, setFollow] = useState(true);
  const [open, setOpen] = useState(false);
  const [drawerHeight, setDrawerHeight] = useState(0);

  const handleBodySelected = (event: SelectChangeEvent) => {
    let body = Astronomy.Body.Moon;

    if (event.target.value in Astronomy.Body) {
      body = Astronomy.Body[event.target.value as keyof typeof Astronomy.Body]
    }

    const newTarget = makeBodyTarget(body);
    setTarget(newTarget);
  };

  const handleFollowChecked = (event: ChangeEvent<HTMLInputElement>) => {
    setFollow(event.target.checked);
  };

  const handleLocationSelected = (newLocation: Location) => {
    setLocation(newLocation);
  };

  const onSliderValueChange: NonNullable<SliderProps["onChange"]> = (_event, value) => {
    if (typeof value !== "number") {
      return;
    }

    setSelectedMinute(value);
  };

  const toggleDrawer = (newOpen: boolean) => () => {
    setOpen(newOpen);
  };

  useEffect(() => {
    let cancelled = false;

    calculateDay(target, location.lat, location.lng, selectedDate).then((newDay) => {
      if (cancelled) {
        return;
      }

      setDay(newDay);
      setSelectedMinute((prev) => Math.min(prev, Math.max(newDay.points.length - 1, 0)));
      setDayLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, [target, location.lat, location.lng, selectedDate]);

  useEffect(() => {
    if (!open) {
      setDrawerHeight(0);
      return;
    }

    const drawerPaper = document.querySelector<HTMLElement>(".MuiDrawer-paper");
    if (!drawerPaper) {
      return;
    }

    const updateDrawerHeight = () => {
      setDrawerHeight(drawerPaper.getBoundingClientRect().height);
    };

    updateDrawerHeight();
    const resizeObserver = new ResizeObserver(updateDrawerHeight);
    resizeObserver.observe(drawerPaper);

    return () => resizeObserver.disconnect();
  }, [open]);

  function updateDate(value: string) {
    setSelectedDate(value);
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Backdrop
        open={isInitialLoad}
        sx={{
          color: "#0752ff",
          zIndex: 1000,
          backgroundColor: "rgba(0, 0, 0, 1)"
        }}
      >
        <CircularProgress color="inherit" />
      </Backdrop>
      <main className="app-shell">
        <header className="page-header">
          <div>
            <h1>Easy<span>vis</span></h1>
          </div>
          <LocationPicker onLocationSelected={handleLocationSelected} />
          <DatePicker
            value={dayjs(selectedDate)}
            onChange={(value) => {
              if (value) {
                updateDate(value.format("YYYY-MM-DD"));
              }
            }}
            format="YYYY-MM-DD"
          />
          <FormGroup>
            <FormControlLabel control={<Checkbox checked={follow} onChange={handleFollowChecked} />} label="Follow body" />
          </FormGroup>
        </header>
        <div className="body-information">
          <div className="object-text">
            <Select
              value={target.name}
              onChange={handleBodySelected}
            >
              {Object.values(Astronomy.Body).filter(v => BODIES.includes(v)).map((item, i) => {
                return (
                  <MenuItem value={item} key={i}>{item}</MenuItem>
                );
              })}
            </Select>
            at <span className="mono object-info">{selectedTime ? selectedTime.toFormat("HH:mm") : "--:--"}</span>:
          </div>
          {selectedPoint && <BodyInfo target={target} selectedPoint={selectedPoint} />}
        </div>
        {day && selectedPoint && (
          <SkyView
            target={day.target}
            selectedPoint={selectedPoint}
            followBody={follow}
            onStarSphereLoaded={() => setStarSphereLoaded(true)}
          />
        )}
        <div className="observation-controls" style={{ bottom: drawerHeight }}>
          <IconButton
            className="drawer-toggle"
            onClick={toggleDrawer(!open)}
          >
            {open ? <KeyboardArrowDownIcon /> : <KeyboardArrowUpIcon />}
          </IconButton>
          {!open && (
            <Slider max={1439} value={selectedMinute} shiftStep={1} className="slider" onChange={onSliderValueChange} />
          )}
        </div>
        <Drawer
          anchor="bottom"
          variant="persistent"
          open={open}
          onClose={toggleDrawer(false)}
          sx={{
            opacity: 0.9
          }}
        >
          <section className="plot-section">
            {day && (
              <VisibilityChart
                day={day}
                selectedMinute={selectedMinute}
                onMinuteChange={setSelectedMinute}
              />
            )}
          </section>
        </Drawer>
      </main>
    </LocalizationProvider>
  );
}

export default App;
