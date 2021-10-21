# RealTimeRayTracing
This is an improvement of ArtemOnigiri's RealTimeRayTracing project.
![Ray tracing](img/Baseview1.png)
![Ray tracing](img/Baseview2.png)
My main improvements:
    1. Added drawing of triangles. Thanks to this, it became possible to create complex 3D models. For example, I created 3D model of Tesla Cybertrack from 80 triangles.
![Tesla Cybertrack 3D model](img/Carmodel1.png)
![Tesla Cybertrack 3D model](img/Carmodel2.png)
    2. Dynamic light has been added. "Sun" moves at a constant speed, sets below the horizon on one side and rises on the other.
![Sun sets](img/Eveningview.png)
![Sun rises](img/Morningview.png)
    3. Added ability to create Cyclic animations for objects. Creating animations you can change positions of objects, their size, color and surface smoothness.
    4. Added fog simulation. You can change its color, density and cloud size.
![Fog](img/Fogsimulation.png)
    5. Added drawing of cylinders.

Additional improvements:
    1. Added FPS counter. (Value is output to the console)
    2. Added automatic and manual adjustment of rays per pixel.
    3. Improved camera control. Downward movement is carried out by C key now. Added acceleration, carried out by LShift key.
![Top view](img/Sceneview.png)