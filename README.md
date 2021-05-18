# WebRTC Peerconnection Tester
A web tester for WebRTC examples/peerconnection.
Simple run this and connected to peerconnection_client in Google WebRTC

## Run with local server
```
npm install http-server
npx http-server -c-1
```

## Run with WebRTC examples/peerconnection.
Maybe you need a small patch on it.

```
--- a/rtc_base/physical_socket_server.cc
+++ b/rtc_base/physical_socket_server.cc
@@ -1175,6 +1175,10 @@ void PhysicalSocketServer::Update(Dispatcher* pdispatcher) {
 
 bool PhysicalSocketServer::Wait(int cmsWait, bool process_io) {
   // We don't support reentrant waiting.
+  if (waiting_) {
+    return false;
+  }
+
   RTC_DCHECK(!waiting_);
   ScopedSetTrue s(&waiting_);
```