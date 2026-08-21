import { useState } from "react";
import {
    MapContainer,
    Marker,
    Popup,
    TileLayer,
    useMapEvents,
} from "react-leaflet";
import type { LeafletMouseEvent } from "leaflet";
import { Button, Dialog } from "@mui/material";
import LocationOn from "@mui/icons-material/LocationOn";
import type { Location } from "../types";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import "leaflet/dist/leaflet.css";


const DefaultIcon = L.icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;


function MapClickHandler({
    onLocationChange,
}: {
    onLocationChange: (e: LeafletMouseEvent) => void;
}) {
    useMapEvents({
        click: onLocationChange,
    });

    return null;
}

function convertToDMS(loc: Location) {
    function toDMS(val: number, isLat: boolean) {
        const absolute = Math.abs(val);
        const degrees = Math.floor(absolute);
        const minutesNotTruncated = (absolute - degrees) * 60;
        const minutes = Math.floor(minutesNotTruncated);
        const seconds = ((minutesNotTruncated - minutes) * 60).toFixed(1);

        let direction = "";
        if (isLat) {
            direction = val >= 0 ? "N" : "S";
        } else {
            direction = val >= 0 ? "E" : "W";
        }

        return `${degrees}°${minutes}′${seconds}″ ${direction}`;
    }

    return {
        latitude: toDMS(loc.lat, true),
        longitude: toDMS(loc.lng, false)
    };
}

export function LocationPicker({onLocationSelected}: { onLocationSelected: (location: Location) => void}) {
    const [open, setOpen] = useState(false);
    const [location, setLocation] = useState<Location>({
        lat: 51.505,
        lng: -0.09,
        zoom: 8,
    });

    const handleClickOpen = () => {
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
    };

    const setMarkerPosition = (e: LeafletMouseEvent): void => {
        const newLocation = {
            lat: e.latlng.lat,
            lng: e.latlng.lng,
            zoom: 8,
        };

        setLocation(newLocation);
        onLocationSelected(newLocation);
    };

    return (
        <div>
            <Button variant="outlined" onClick={handleClickOpen} className="location-button">
                {`${convertToDMS(location).latitude}, ${convertToDMS(location).longitude}`}
                <LocationOn style={{ position: "absolute", right: 5 }} />
            </Button>
            <Dialog
                open={open}
                onClose={handleClose}
            >
                <div className="map">
                    <MapContainer
                        center={[location.lat, location.lng]}
                        zoom={location.zoom}
                        scrollWheelZoom={true}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <MapClickHandler onLocationChange={setMarkerPosition} />
                        <Marker position={[location.lat, location.lng]}>
                            <Popup>{`${convertToDMS(location).latitude}, ${convertToDMS(location).longitude}`}</Popup>
                        </Marker>
                    </MapContainer>
                    <div className="location-info">
                        <strong>Selected location</strong>
                        <div>{`${convertToDMS(location).latitude}, ${convertToDMS(location).longitude}`}</div>
                    </div>
                </div>
            </Dialog>
        </div>
    );
}