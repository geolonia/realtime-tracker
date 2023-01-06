import React from 'react';
import tilebelt from '@mapbox/tilebelt'
import { Space } from '@spatial-id/javascript-sdk';
import {v4} from 'uuid'
import './App.scss';

import style from './style.json'

window.Space = Space;

declare global {
  interface Window {
    geolonia: any;
    Space: typeof Space;
  }
}

const dataToGeoJSONFeature: (data: any) => GeoJSON.Feature = (data) => {
  const space = new Space(data.tilehash);
  return {
    type: "Feature",
    id: data.id,
    properties: {
      tilehash: data.tilehash,
      zfxy: data.zfxy,
    },
    geometry: space.toGeoJSON(),
  };
};

const ws = new WebSocket('wss://api-ws.geolonia.com/dev');
const adminUrl = `https://api-ws-admin.geolonia.com/dev`;
const channel = 'realtime-tracker'
const defaultResolution = 10
const uid = v4()

const App = () => {
  const mapContainer = React.useRef(null)
  const range = React.useRef(null)

  const [resolution, setResolution] = React.useState<number>(defaultResolution)
  const [location, setLocation] = React.useState({} as any)

  const onChange = (event: React.FormEvent<HTMLInputElement>) => {
    setResolution(Number(event.currentTarget.value))
  }

  React.useEffect(() => {
    const wsOpenEvent = () => {
      console.log('WebSocket opened')
      ws.send(JSON.stringify({
        action: "subscribe",
        channel: channel,
      }));
    };
    ws.addEventListener('open', wsOpenEvent);

    const map = new window.geolonia.Map({
      container: mapContainer.current,
      style: style,
      hash: true,
    })

    const geolocate = new window.geolonia.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true
      },
      trackUserLocation: true
    })

    map.addControl(geolocate)

    geolocate.on('geolocate', (data: object) => {
      setLocation(data)
    });

    let features: GeoJSON.Feature[] = [];

    const wsMessageListener = (message: MessageEvent<string>) => {
      const data = JSON.parse(message.data);
      if (!data.id || !data.tilehash) { return; }

      const newFeature = dataToGeoJSONFeature(data);
      features = [
        ...features.filter((feat) => feat.id !== data.id),
        newFeature,
      ];

      const source = map.getSource('users');
      source.setData({
        type: "FeatureCollection", features,
      });

      if (uid !== data.id) {
        map.fitBounds(newFeature.geometry, {
          padding: 80,
          duration: 500,
        });
      }
    }

    map.on('load', async () => {
      const initialDataResp = await fetch(`${adminUrl}/channels/${channel}/messages`);
      const initialDataJson = await initialDataResp.json();
      console.log(initialDataJson);

      features = initialDataJson.data.map((data: any) => {
        return dataToGeoJSONFeature(data);
      });

      map.addSource('users', {
        type: 'geojson',
        data: { type: "FeatureCollection", features },
      });
      map.addLayer({
        'id': `users-fill`,
        'type': 'fill',
        'source': 'users',
        'paint': {
          'fill-color': 'rgba(255, 0, 0, 0.2)',
        }
      });

      ws.addEventListener('message', wsMessageListener);
    })

    return () => {
      ws.removeEventListener('open', wsOpenEvent);
      ws.removeEventListener('message', wsMessageListener);
    };
  }, [mapContainer]);

  React.useEffect(() => {
    if (resolution && location && location.coords) {
      const coords = location.coords; // 座標
      const tile = tilebelt.pointToTile(coords.longitude, coords.latitude, resolution) // 座標からタイル番号に変換
      const space = new Space({ lng: coords.longitude, lat: coords.latitude }, resolution);

      ws.send(JSON.stringify({
        action: "broadcast",
        channel: channel,
        id: uid,
        tilehash: space.tilehash,
        ttl: 300,
        message: {
          tile: tile, // タイル番号のみを送信している
          // tilehash: space.tilehash,
        }
      }));
    }
  }, [resolution, location])

  return (
    <div className="App">
      <div id="map" ref={mapContainer} data-navigation-control="on" data-gesture-handling="off" />
      <div className="privacy-control"><input ref={range} type="range" min="1" max="25" value={resolution} onChange={onChange} /></div>
    </div>
  );
}

export default App;
