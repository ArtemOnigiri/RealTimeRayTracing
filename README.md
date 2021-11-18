# RealTimeRayTracing

Here are some improvements for ArtemOnigiri's RealTimeRayTracing project.

![Ray tracing](img/GeneralView1.png)

## My improvements:

1. Added the ability to create triangles. Thanks to this, it became possible to create complex 3D models. For example, I created a 3D model of a Tesla CyberTruck from 80 triangles.

![Tesla CyberTruck](img/CarModel1.png)
![Tesla CyberTruck](img/CarModel2.png)

2. Added the ability to create cyclic animations for objects. Using animations, you can change the position of objects, their size, color and reflectivity of the surface.

![Ray tracing](img/CloseView.png)

3. Improved algorithm for calculating ray reflections from object surfaces. Now the number of reflections depends on the reflectivity of the surface.

![Ray tracing](img/GeneralView2.png)

4. Added a system for dynamically adjusting the number of samples per pixel to ensure the best balance of quality and performance. Demo images show rendering on NVIDIA GeForce GTX 1650 in 30 samples at 15 FPS.

![Ray tracing](img/Reflections.png)

5. Added fog simulation. You can change the color, density and size of the cloud.

![Ray tracing](img/FogSimulation.png)

6. Improved image quality, reduced noise, added anti-aliasing.
7. Added the ability to create cylinders, added functions for quick and convenient creation of the right prisms and pyramids.