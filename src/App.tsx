import React from 'react';
import tilebelt from '@mapbox/tilebelt'
import {v4} from 'uuid'
import './App.scss';

import style from './style.json'

declare global {
  interface Window {
    geolonia: any;
  }
}

const ws = new WebSocket('wss://api-ws.geolonia.com/dev');
const channel = 'realtime-tracker'
const defaultResolution = 10

const App = () => {
  const mapContainer = React.useRef(null)
  const range = React.useRef(null)

  const [uid] = React.useState<string>(v4())
  const [resolution, setResolution] = React.useState(defaultResolution)
  const [location, setLocation] = React.useState({} as any)

  const onChange = (event: React.FormEvent<HTMLInputElement>) => {
    setResolution(Number(event.currentTarget.value))
  }

  React.useEffect(() => {
    if (!uid) {
      return
    }

    ws.addEventListener('open', () => {
      console.log('WebSocket opened')
      ws.send(JSON.stringify({
        action: "subscribe",
        channel: channel,
      }));
    })

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

    map.on('load', () => {
      ws.addEventListener('message', (message) => {
        const rawPayload = JSON.parse(message.data);
        const payload = rawPayload.msg;
        if (payload && payload.uid && payload.tile) {
          const bbox = tilebelt.tileToBBOX(payload.tile)
          const geojson = {
            "type": "FeatureCollection",
            "features": [{
              "type": "Feature",
              "properties": {},
              "geometry": {
                "type": "Polygon",
                "coordinates": [
                  [
                    [bbox[0], bbox[1]],
                    [bbox[2], bbox[1]],
                    [bbox[2], bbox[3]],
                    [bbox[0], bbox[3]],
                    [bbox[0], bbox[1]]
                  ]
                ]
              }
            }]
          }

          const source = map.getSource(payload.uid)

          if (source) {
            source.setData(geojson)
          } else {
            map.addSource(payload.uid, {
              type: 'geojson',
              data: geojson,
            });

            map.addLayer({
              'id': payload.uid,
              'type': 'fill',
              'source': payload.uid,
              'paint': {
                'fill-color': 'rgba(255, 0, 0, 0.1)',
              }
            });

            if (uid !== payload.uid) {
              map.fitBounds(bbox)
            }
          }
        }
      })
    })
  }, [mapContainer, uid])

  React.useEffect(() => {
    if (resolution && uid && location && location.coords) {
      const coords = location.coords // 座標
      const tile = tilebelt.pointToTile(coords.longitude, coords.latitude, resolution) // 座標からタイル番号に変換

      ws.send(JSON.stringify({
        action: "broadcast",
        channel: channel,
        message: {
          uid: uid,
          tile: tile // タイル番号のみを送信している
        }
      }));
    }
  }, [resolution, location, uid])

  return (
    <div className="App">
      <div id="map" ref={mapContainer} data-navigation-control="on" />
      <div className="privacy-control">1 <input ref={range} type="range" min="1" max="25" value={resolution} onChange={onChange} /> 25</div>
    </div>
  );
}

export default App;
