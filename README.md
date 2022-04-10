# Privacy-sensitive location sharing using tile numbers

- Geo location button shows the current location, and shares the location information with other users via WebSocket.
- Shared information only includes tile numbers based on resolution. The tile number is calculated on the client side before transmission, therefore the no coordinates (latitude and longitude) are sent to the server.
- By default, location information is shared at a resolution equivalent to zoom level 10 (approximately 25 km to 37 km per side in Japan). Resolution can be adjusted using the bar at the bottom of the page.
- If the bar value is set to 25 (rightmost), the resolution of the shared location information is around 1.5 meters.

# タイル番号を利用したプライバシーに配慮した位置情報の共有

https://geolonia.github.io/realtime-tracker/

* 右側にあるジオロケーションボタンをクリックすると、現在位置が表示され、WebSocket 経由でこのページを見ている他のユーザーにも位置情報が共有されます。
* 共有される位置情報は、後述する分解能に基づいたタイル番号のみであり、タイル番号はクライアントサイドで送信前に算出していますので、正確な緯度経度はサーバーサイドには一切送信していません。
* デフォルトでは、位置情報はズームレベル10相当（日本国内では1辺の距離が約25km〜37km）の分解能で共有され、この分解能はページの下部にあるバーで調整することができます。
* バーの値を25（一番右）にすると、共有される位置情報の分解能は概ね1.5m前後になります。
