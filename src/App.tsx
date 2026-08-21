import { useEffect, useState } from "react";
import * as Astronomy from "astronomy-engine";
import { makePlanetTarget } from "./astronomy/targets";
import "./index.css";
import { SkyView } from "./components/skyView";
import { Drawer, IconButton, Slider, type SliderProps } from "@mui/material";
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


const TARGET = makePlanetTarget(Astronomy.Body.Moon);

function App() {
  const [location, setLocation] = useState<Location>({
    lat: 51.505,
    lng: -0.09,
    zoom: 8,
  })
  const [selectedDate, setSelectedDate] = useState(() =>
    getLocalDate(location.lat, location.lng),
  );
  const [day, setDay] = useState(() =>
    calculateDay(TARGET, location.lat, location.lng, selectedDate),
  );
  const [selectedMinute, setSelectedMinute] = useState(0);
  const selectedPoint = day.points[selectedMinute];
  const selectedTime = selectedPoint.localTime;
  const [open, setOpen] = useState(false);
  const [drawerHeight, setDrawerHeight] = useState(0);

  const handleLocationSelected = (newLocation: Location) => {
    setLocation(newLocation);
    setDay(
      calculateDay(
        TARGET,
        newLocation.lat,
        newLocation.lng,
        selectedDate,
      ),
    );
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
    setDay(calculateDay(TARGET, location.lat, location.lng, value));
  }

  function formatNumber(value: number) {
    const [whole, decimal] = value.toFixed(3).split(".");
    return `${whole.padStart(3, " ")}.${decimal}`;
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <main className="app-shell">
        <header className="page-header">
          <div>
            <h1>Easy<span>vis</span></h1>
            <p className="subtitle">^ Moram promijenit ovo at some point</p>
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
        </header>
        <div className="body-information">
          <div className="subtitle">
            <p className="object-text">The <span className="object-info">{day.target.name}</span> at <span className="mono object-info">{selectedTime.toFormat("HH:mm")}</span>:</p>
            <div className="object-details">
              <div className="flex-item">
                <span className="object-text">Altitude:</span>
                <span className="mono format-num object-info">{formatNumber(selectedPoint.altitude)}°</span>
              </div>
              <div className="flex-item">
                <span className="object-text">Azimuth:</span>
                <span className="mono format-num object-info">{formatNumber(selectedPoint.azimuth)}°</span>
              </div>
              <div className="flex-item">
                <span className="object-text">Visibility score:</span>
                <span className="mono object-info">{formatNumber(selectedPoint.score)}</span>
              </div>
            </div>
          </div>
        </div>
        <SkyView
          target={day.target}
          bodyAltitude={selectedPoint.altitude}
          bodyAzimuth={selectedPoint.azimuth}
          sunAltitude={selectedPoint.sunAltitude}
          sunAzimuth={selectedPoint.sunAzimuth}
        />
        <div className="observation-controls" style={{ bottom: drawerHeight }}>
          <IconButton
            className="drawer-toggle"
            aria-label={open ? "Close visibility forecast" : "Open visibility forecast"}
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
            <VisibilityChart
              day={day}
              selectedMinute={selectedMinute}
              onMinuteChange={setSelectedMinute}
            />
          </section>
        </Drawer>
      </main>
    </LocalizationProvider>
  );
}

export default App;
