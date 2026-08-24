const TILE_SIZE = 600;
const TILE_DEG = 5.0;
const RES = 120.0;

const TILE_BASE_PATH = `${import.meta.env.BASE_URL}/tiles`;

function mod(n: number, m: number): number {
    return ((n % m) + m) % m;
}

function compressedToRatio(x: number): number {
    return (5.0 / 195.0) * (Math.exp(0.0195 * x) - 1.0);
}

function ratioToMpsas(ratio: number): number {
    return 22.0 - 5.0 * Math.log(1.0 + ratio) / Math.log(100.0);
}

interface TileCoords {
    tilex: number;
    tiley: number;
    ix: number;
    iy: number;
}

function resolveTileCoords(lat: number, lon: number): TileCoords | null {
    const lonFromDateLine = mod(lon + 180.0, 360.0);
    const latFromStart = lat + 65.0;

    const tilex = Math.floor(lonFromDateLine / TILE_DEG) + 1;
    const tiley = Math.floor(latFromStart / TILE_DEG) + 1;

    if (tiley < 1 || tiley > 28) {
        return null;
    }

    const ix = Math.round(RES * (lonFromDateLine - TILE_DEG * (tilex - 1) + 1.0 / (2 * RES)));
    const iy = Math.round(RES * (latFromStart - TILE_DEG * (tiley - 1) + 1.0 / (2 * RES)));

    return { tilex, tiley, ix, iy };
}

const tileCache = new Map<string, Uint8Array>();
const inFlightRequests = new Map<string, Promise<Uint8Array>>();

async function fetchTileBytes(tilex: number, tiley: number, signal?: AbortSignal): Promise<Uint8Array> {
    const key = `${tilex}_${tiley}`;

    const cached = tileCache.get(key);
    if (cached) {
        return cached;
    }

    let inFlight = inFlightRequests.get(key);
    if (!inFlight) {
        inFlight = (async () => {
            const url = `${TILE_BASE_PATH}/binary_tile_${tilex}_${tiley}.dat.gz`;
            const response = await fetch(url, { cache: "force-cache" });
            if (!response.ok) {
                throw new Error(`Failed to fetch tile ${key}: ${response.status}`);
            }
            
            const contentEncoding = response.headers.get("content-encoding");
            const isPreDecompressed = contentEncoding === "gzip";
            const buffer = isPreDecompressed
                ? await response.arrayBuffer()
                : await new Response(response.body!.pipeThrough(new DecompressionStream("gzip"))).arrayBuffer();
            const bytes = new Uint8Array(buffer);

            const expectedSize = 2 + (TILE_SIZE * TILE_SIZE - 1);
            if (bytes.length < expectedSize) {
                throw new Error(`Tile ${key} incomplete: got ${bytes.length} bytes, expected ${expectedSize}`);
            }

            tileCache.set(key, bytes);
            return bytes;
        })();

        inFlightRequests.set(key, inFlight);
        inFlight.finally(() => inFlightRequests.delete(key));
    }

    if (!signal) {
        return inFlight;
    }

    return new Promise<Uint8Array>((resolve, reject) => {
        const onAbort = () => reject(new DOMException("Aborted", "AbortError"));
        signal.addEventListener("abort", onAbort, { once: true });

        inFlight!.then(
            (bytes) => {
                signal.removeEventListener("abort", onAbort);
                resolve(bytes);
            },
            (err) => {
                signal.removeEventListener("abort", onAbort);
                reject(err);
            }
        );
    });
}

function signedByte(b: number): number {
    return b >= 128 ? b - 256 : b;
}

function decodeValueAt(data: Uint8Array, ix: number, iy: number): number {
    const firstNumber = 128 * data[0] + data[1];

    let change = 0;
    for (let i = 1; i < iy; i++) {
        change += signedByte(data[TILE_SIZE * i + 1]);
    }
    for (let i = 1; i < ix; i++) {
        change += signedByte(data[TILE_SIZE * (iy - 1) + 1 + i]);
    }

    return firstNumber + change;
}

export interface SkyQualityResult {
    brightnessRatio: number;
    sqmZenith: number;
}

export async function skyQualityAt(lat: number, lon: number, signal?: AbortSignal): Promise<SkyQualityResult | null> {
    const coords = resolveTileCoords(lat, lon);
    if (!coords) {
        return null;
    }

    const data = await fetchTileBytes(coords.tilex, coords.tiley, signal);
    const compressed = decodeValueAt(data, coords.ix, coords.iy);
    if (!Number.isFinite(compressed)) {
        console.error("Bad decode:", { coords, dataLength: data.length });
        throw new Error("Corrupt tile decode");
    }

    const brightnessRatio = compressedToRatio(compressed);
    const sqmZenith = ratioToMpsas(brightnessRatio);

    return { brightnessRatio, sqmZenith };
}