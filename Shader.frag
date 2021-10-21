#version 130

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform vec3 u_pos;
uniform float u_time;
uniform sampler2D u_sample;
uniform float u_sample_part;
uniform vec2 u_seed1;
uniform vec2 u_seed2;
uniform int u_rays;
uniform vec2 u_light;

const float MAX_DIST = 99999.0;
const int MAX_REF = 4;
vec3 light = normalize(vec3(0.0, u_light.x, u_light.y));
uvec4 R_STATE;

uint TausStep(uint z, int S1, int S2, int S3, uint M)
{
	uint b = (((z << S1) ^ z) >> S2);
	return (((z & M) << S3) ^ b);	
}

uint LCGStep(uint z, uint A, uint C)
{
	return (A * z + C);	
}

vec2 hash22(vec2 p)
{
	p += u_seed1.x;
	vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973));
	p3 += dot(p3, p3.yzx+33.33);
	return fract((p3.xx+p3.yz)*p3.zy);
}

float random()
{
	R_STATE.x = TausStep(R_STATE.x, 13, 19, 12, uint(4294967294));
	R_STATE.y = TausStep(R_STATE.y, 2, 25, 4, uint(4294967288));
	R_STATE.z = TausStep(R_STATE.z, 3, 11, 17, uint(4294967280));
	R_STATE.w = LCGStep(R_STATE.w, uint(1664525), uint(1013904223));
	return 2.3283064365387e-10 * float((R_STATE.x ^ R_STATE.y ^ R_STATE.z ^ R_STATE.w));
}

float move(float x, float t, float d) 
{
	if (u_time < d) return 0.0;
	float time = (u_time - d) - (t * floor((u_time - d) / t));
	float dist = x * (time / t);
	if (time < t / 2.0) return dist;
	else return -dist + x;
}

vec3 randomOnSphere() {
	vec3 rand = vec3(random(), random(), random());
	float theta = rand.x * 2.0 * 3.14159265;
	float v = rand.y;
	float phi = acos(2.0 * v - 1.0);
	float r = pow(rand.z, 1.0 / 3.0);
	float x = r * sin(phi) * cos(theta);
	float y = r * sin(phi) * sin(theta);
	float z = r * cos(phi);
	return vec3(x, y, z);
}

mat2 rot(float a) {
	float s = sin(a);
	float c = cos(a);
	return mat2(c, -s, s, c);
}

vec2 sphIntersect(in vec3 ro, in vec3 rd, float ra) {
	float b = dot(ro, rd);
	float c = dot(ro, ro) - ra * ra;
	float h = b * b - c;
	if(h < 0.0) return vec2(-1.0);
	h = sqrt(h);
	return vec2(-b - h, -b + h);
}

vec2 boxIntersection(in vec3 ro, in vec3 rd, in vec3 rad, out vec3 oN)  {
	vec3 m = 1.0 / rd;
	vec3 n = m * ro;
	vec3 k = abs(m) * rad;
	vec3 t1 = -n - k;
	vec3 t2 = -n + k;
	float tN = max(max(t1.x, t1.y), t1.z);
	float tF = min(min(t2.x, t2.y), t2.z);
	if(tN > tF || tF < 0.0) return vec2(-1.0);
	oN = -sign(rd) * step(t1.yzx, t1.xyz) * step(t1.zxy, t1.xyz);
	return vec2(tN, tF);
}

float plaIntersect(in vec3 ro, in vec3 rd, in vec4 p) {
	return -(dot(ro, p.xyz) + p.w) / dot(rd, p.xyz);
}

vec3 triIntersection(in vec3 ro, in vec3 rd, in vec3 v0, in vec3 v1, in vec3 v2) {
	vec3 v1v0 = v1 - v0;
	vec3 v2v0 = v2 - v0;
	vec3 rov0 = ro - v0;
	vec3 n = cross(v1v0, v2v0);
	vec3 q = cross(rov0, rd);
	float d = 1.0 / dot(rd, n);
	float u = d * dot(-q, v2v0);
	float v = d * dot(q, v1v0);
	float t = d * dot(-n, rov0);
	if (u < 0.0 || u > 1.0 || v < 0.0 || (u + v) > 1.0) {
		t = -1.0;
	}
	return vec3(t, u, v);
}

vec4 cylIntersection(in vec3 ro, in vec3 rd, in vec3 pa, in vec3 pb, float ra) {
	vec3 ca = pb - pa;
	vec3 oc = ro - pa;
	float caca = dot(ca, ca);
	float card = dot(ca, rd);
	float caoc = dot(ca, oc);
	float a = caca - card * card;;
	float b = caca * dot(oc, rd) - caoc * card;
	float c = caca * dot(oc, oc) - caoc * caoc - ra * ra * caca;
	float h = b * b - a * c;
	if (h < 0.0) return vec4(-1.0);
	h = sqrt(h);
	float t = (-b-h) / a;
	float y = caoc + t * card;
	if (y > 0.0 && y < caca) return vec4(t, (oc + t * rd - ca * y / caca) / ra);
	t = (((y < 0.0) ? 0.0 : caca) - caoc) / card;
	if (abs(b + a * t) < h) return vec4(t, ca * sign(y) / caca);
	return vec4(-1.0);
}

vec3 getSky(vec3 rd) {
	vec3 col = vec3(0.4, 0.6, 1.0);
	vec3 sun = vec3(0.95, 0.9, 1.0);
	sun *= max(0.0, pow(dot(rd, light), 256.0));
	col *= max(0.0, dot(light, vec3(0.0, 0.0, -1.0)));
	return clamp(sun + col * 0.01, 0.0, 1.0);
}

mat3x3[6] Pyramid(vec3 a, vec3 b, vec3 c, vec3 d, vec3 h) {
	mat3x3 triangles[6];
	triangles[0][0] = a;
	triangles[0][1] = b;
	triangles[0][2] = d;

	triangles[1][0] = b;
	triangles[1][1] = d;
	triangles[1][2] = c;

	triangles[2][0] = a;
	triangles[2][1] = b;
	triangles[2][2] = h;

	triangles[3][0] = b;
	triangles[3][1] = c;
	triangles[3][2] = h;

	triangles[4][0] = c;
	triangles[4][1] = d;
	triangles[4][2] = h;

	triangles[5][0] = a;
	triangles[5][1] = d;
	triangles[5][2] = h;
	return triangles;
}

mat3x3[12] Box(vec3 a, vec3 b, vec3 c, vec3 d, vec3 a1, vec3 b1, vec3 c1, vec3 d1) {
	mat3x3 triangles[12];
	triangles[0][0] = a;
	triangles[0][1] = a1;
	triangles[0][2] = b;

	triangles[1][0] = a1;
	triangles[1][1] = b;
	triangles[1][2] = b1;

	triangles[2][0] = b;
	triangles[2][1] = b1;
	triangles[2][2] = c;

	triangles[3][0] = b1;
	triangles[3][1] = c;
	triangles[3][2] = c1;

	triangles[4][0] = c;
	triangles[4][1] = c1;
	triangles[4][2] = d;

	triangles[5][0] = c1;
	triangles[5][1] = d;
	triangles[5][2] = d1;

	triangles[6][0] = d;
	triangles[6][1] = d1;
	triangles[6][2] = a1;

	triangles[7][0] = d;
	triangles[7][1] = a;
	triangles[7][2] = a1;

	triangles[8][0] = a;
	triangles[8][1] = b;
	triangles[8][2] = c;

	triangles[9][0] = a;
	triangles[9][1] = d;
	triangles[9][2] = c;

	triangles[10][0] = a1;
	triangles[10][1] = b1;
	triangles[10][2] = c1;

	triangles[11][0] = a1;
	triangles[11][1] = d1;
	triangles[11][2] = c1;
	return triangles;
}

vec4 castRay(inout vec3 ro, inout vec3 rd) {
	vec4 col;
	vec2 minIt = vec2(MAX_DIST);
	vec2 it;
	vec3 n;

	mat2x4 spheres[3];
	spheres[0][0] = vec4(39.0, 8.0, -0.01, 1.0);
	spheres[1][0] = vec4(43.5, 3.0, -0.01, 1.0);
	spheres[2][0] = vec4(41.0, 1.0, -0.01, 1.0);

	spheres[0][1] = vec4(1.0, 1.0, 1.0, -0.5);
	spheres[1][1] = vec4(1.0, 1.0, 1.0, 0.5);
	spheres[2][1] = vec4(1.0, 0.0, 0.5, 1.0);

	for(int i = 0; i < spheres.length(); i++) {
		it = sphIntersect(ro - spheres[i][0].xyz, rd, spheres[i][0].w);
		if(it.x > 0.0 && it.x < minIt.x) {
			minIt = it;
			vec3 itPos = ro + rd * it.x;
			n = normalize(itPos - spheres[i][0].xyz);
			col = spheres[i][1];
		}
	}

	mat2x4 lightSpheres[3];
	lightSpheres[0][0] = vec4(36.0 + move(20.0, 32.0, 0.0), move(20.0, 32.0, 8.0), -4.0, 0.4 + move(0.4, 8.0, 0.0));
	lightSpheres[1][0] = vec4(46.0 - move(20.0, 32.0, 0.0), 10 - move(20.0, 32.0, 8.0), -4.0, 0.8 - move(0.4, 8.0, 0.0));

	lightSpheres[0][1] = vec4(1.0, 1.0, 1.0, -2.0);
	lightSpheres[1][1] = vec4(1.0, 1.0, 1.0, -2.0);

	for(int i = 0; i < lightSpheres.length(); i++) {
		it = sphIntersect(ro - lightSpheres[i][0].xyz, rd, lightSpheres[i][0].w);
		if(it.x > 0.0 && it.x < minIt.x) {
			minIt = it;
			vec3 itPos = ro + rd * it.x;
			n = normalize(itPos - lightSpheres[i][0].xyz);
			col = lightSpheres[i][1];
		}
	}

	vec4 fog = vec4(18.0 + random() * 5, 38.0 + random() * 5, -2.0 + random() * 5, 5.0 + random() * 10 - move(10, 60, 0));
	it = sphIntersect(ro - fog.xyz, rd, fog.w);
	if(it.x > 0.0 && it.x < minIt.x) {
		minIt = it;
		vec3 itPos = ro + rd * it.x;
		n = normalize(itPos - fog.xyz);
		col = vec4(0.65, 0.55, 0.45, 0.0);
	}

	vec3 boxN;
	mat2x4 boxes[2];
	boxes[0][0] = vec4(45.0, 6.0, -0.001, 1.0);
	boxes[1][0] = vec4(20.5, 40.5, 0.5, 1.0);

	boxes[0][1] = vec4(0.9, 0.2, 0.2, -0.5);
	boxes[1][1] = vec4(1.0, 0.5, 0.0, -2.0);

	for(int i = 0; i < boxes.length(); i++) {
		it = boxIntersection(ro - boxes[i][0].xyz, rd, vec3(boxes[i][0].w), boxN);
		if(it.x > 0.0 && it.x < minIt.x) {
			minIt = it;
			n = boxN;
			col = boxes[i][1];
		}
	}

	mat2x4 cubes[3];
	cubes[0][0] = vec4(47.0, 2.0, -0.001, 1.0);
	cubes[1][0] = vec4(47.0, 0.0 + move(4.0, 10.0, 0.0), -0.001 - move(4.0, 10.0, 0.0), 1.0);
	cubes[2][0] = vec4(47.0, -2.0 + move(8.0, 10.0, 0.0), -0.001 - move(8.0, 10.0, 0.0), 1.0);

	cubes[0][1] = vec4(1.0, 0.1, 0.1, 1.0);
	cubes[1][1] = vec4(0.1, 1.0, 0.1, 1.0);
	cubes[2][1] = vec4(0.1, 0.1, 1.0, 1.0);

	for(int i = 0; i < cubes.length(); i++) {
		it = boxIntersection(ro - cubes[i][0].xyz, rd, vec3(cubes[i][0].w), boxN);
		if(it.x > 0.0 && it.x < minIt.x) {
			minIt = it;
			n = boxN;
			col = cubes[i][1];
		}
	}

	vec3 planeNormal = vec3(0.0, 0.0, -1.0);
	it = vec2(plaIntersect(ro, rd, vec4(planeNormal, 1.0)));
	if(it.x > 0.0 && it.x < minIt.x) {
		minIt = it;
		n = planeNormal;
		col = vec4(0.5, 0.25, 0.1, 0.01);
	}

	mat3x3[6] pyramid = Pyramid( vec3(45.0, 10.0, 1.0), vec3(43.0, 10.0, 1.0), vec3(43.0, 8.0, 1.0), vec3(45.0, 8.0, 1.0), vec3(44.0, 9.0, -1.0) );

	mat3x3[6] u_pyramid = Pyramid( vec3(39.5, 5.5, -0.5), vec3(40.5, 5.5, -0.5), vec3(40.5, 4.5, -0.5), vec3(39.5, 4.5, -0.5), vec3(40.0, 5.0, -1.0) );
	mat3x3[6] d_pyramid = Pyramid( vec3(39.5, 5.5, 0.5), vec3(40.5, 5.5, 0.5), vec3(40.5, 4.5, 0.5), vec3(39.5, 4.5, 0.5), vec3(40.0, 5.0, 1.0) );

	mat3x3[12] trapezoid = Box(vec3(40.5, 10.5, -0.7), vec3(40.5, 11.5, -0.7), vec3(41.5, 11.5, -0.7), vec3(41.5, 10.5, -0.7), vec3(40.0, 10.0, 1.0), vec3(40.0, 12.0, 1.0), vec3(42.0, 12.0, 1.0), vec3(42.0, 10.0, 1.0));

	mat3x3 Triangles[42];
	Triangles[0] = pyramid[0];
	Triangles[1] = pyramid[1];
	Triangles[2] = pyramid[2];
	Triangles[3] = pyramid[3];
	Triangles[4] = pyramid[4];
	Triangles[5] = pyramid[5];

	Triangles[6] = u_pyramid[2];
	Triangles[7] = u_pyramid[3];
	Triangles[8] = u_pyramid[4];
	Triangles[9] = u_pyramid[5];

	Triangles[10] = d_pyramid[2];
	Triangles[11] = d_pyramid[3];
	Triangles[12] = d_pyramid[4];
	Triangles[13] = d_pyramid[5];

	Triangles[14] = mat3x3( vec3(39.5, 5.5, -0.5), vec3(39.5, 5.5, 0.5), vec3(40.0, 6.0, 0.0) );
	Triangles[15] = mat3x3( vec3(39.5, 5.5, -0.5), vec3(40.0, 6.0, 0.0), vec3(40.5, 5.5, -0.5) );
	Triangles[16] = mat3x3( vec3(40.0, 6.0, 0.0), vec3(40.5, 5.5, 0.5), vec3(40.5, 5.5, -0.5) );
	Triangles[17] = mat3x3( vec3(40.0, 6.0, 0.0), vec3(39.5, 5.5, 0.5), vec3(40.5, 5.5, 0.5) );

	Triangles[18] = mat3x3( vec3(39.5, 4.5, 0.5), vec3(40.5, 4.5, 0.5), vec3(40.0, 4.0, 0.0) );
	Triangles[19] = mat3x3( vec3(39.5, 4.5, -0.5), vec3(40.0, 4.0, 0.0), vec3(40.5, 4.5, -0.5) );
	Triangles[20] = mat3x3( vec3(40.0, 4.0, 0.0), vec3(40.5, 4.5, 0.5), vec3(40.5, 4.5, -0.5) );
	Triangles[21] = mat3x3( vec3(40.0, 4.0, 0.0), vec3(39.5, 4.5, 0.5), vec3(39.5, 4.5, -0.5) );

	Triangles[22] = mat3x3( vec3(39.5, 5.5, -0.5), vec3(39.5, 5.5, 0.5), vec3(39.0, 5.0, 0.0) );
	Triangles[23] = mat3x3( vec3(39.5, 5.5, -0.5), vec3(39.0, 5.0, 0.0), vec3(39.5, 4.5, -0.5) );
	Triangles[24] = mat3x3( vec3(39.0, 5.0, 0.0), vec3(39.5, 4.5, 0.5), vec3(39.5, 4.5, -0.5) );
	Triangles[25] = mat3x3( vec3(39.0, 5.0, 0.0), vec3(39.5, 4.5, 0.5), vec3(39.5, 5.5, 0.5) );

	Triangles[26] = mat3x3( vec3(40.5, 5.5, -0.5), vec3(40.5, 5.5, 0.5), vec3(41.0, 5.0, 0.0) );
	Triangles[27] = mat3x3( vec3(40.5, 5.5, -0.5), vec3(41.0, 5.0, 0.0), vec3(40.5, 4.5, -0.5) );
	Triangles[28] = mat3x3( vec3(41.0, 5.0, 0.0), vec3(40.5, 4.5, 0.5), vec3(40.5, 4.5, -0.5) );
	Triangles[29] = mat3x3( vec3(41.0, 5.0, 0.0), vec3(40.5, 4.5, 0.5), vec3(40.5, 5.5, 0.5) );

	Triangles[30] = trapezoid[0];
	Triangles[31] = trapezoid[1];
	Triangles[32] = trapezoid[2];
	Triangles[33] = trapezoid[3];
	Triangles[34] = trapezoid[4];
	Triangles[35] = trapezoid[5];
	Triangles[36] = trapezoid[6];
	Triangles[37] = trapezoid[7];
	Triangles[38] = trapezoid[8];
	Triangles[39] = trapezoid[9];
	Triangles[40] = trapezoid[10];
	Triangles[41] = trapezoid[11];

	vec4 TriColors[3];
	TriColors[0] = vec4(0.4, 0.9, 0.1, 0.85);
	TriColors[1] = vec4(0.1, 0.4, 0.9, 0.05);
	TriColors[2] = vec4(move(1.0, 10.0, 0.0), move(1.0, 10.0, 5.0), move(1.0, 10.0, 10.0), move(1.0, 5.0, 0.0));

	for (int i = 0; i < Triangles.length(); i++) {
		it = vec2(triIntersection(ro, rd, Triangles[i][0], Triangles[i][1], Triangles[i][2]));
		if(it.x > 0.0 && it.x < minIt.x) {
			minIt = it;
			vec3 itPos = ro + rd * it.x;
			n = normalize(itPos - triIntersection(ro, rd, Triangles[i][0], Triangles[i][1], Triangles[i][2]));
			if (i < 6) {
				col = TriColors[0];
			} 
			else if (i < 30) {
				col = TriColors[1];
			}
			else {
				col = TriColors[2];
			}
		}
	}

	mat3x3 CybertrackModel[80];
	CybertrackModel[0] = mat3x3( vec3(7.5, -2.75, 0.0), vec3(7.5, -2.25, -2.25), vec3(7.5, 2.75, 0.0) );
	CybertrackModel[1] = mat3x3( vec3(7.5, -2.25, -2.25), vec3(7.5, 2.25, -2.25), vec3(7.5, 2.75, 0.0) );
	CybertrackModel[2] = mat3x3( vec3(7.5, -2.25, -2.25), vec3(6.5, -3.5, -2.25), vec3(7.5, -2.75, 0.0) );
	CybertrackModel[3] = mat3x3( vec3(7.5, -2.75, 0.0), vec3(7.0, -3.5, -0.25), vec3(6.5, -3.5, -2.25) );
	CybertrackModel[4] = mat3x3( vec3(7.5, 2.25, -2.25), vec3(6.5, 3.5, -2.25), vec3(7.5, 2.75, 0.0) );
	CybertrackModel[5] = mat3x3( vec3(7.5, 2.75, 0.0), vec3(7.0, 3.5, -0.25), vec3(6.5, 3.5, -2.25) );
	CybertrackModel[6] = mat3x3( vec3(7.5, -2.25, -2.25), vec3(7.5, -2.25, -2.5), vec3(7.5, 2.25, -2.25) );
	CybertrackModel[7] = mat3x3( vec3(7.5, 2.25, -2.25), vec3(7.5, 2.25, -2.5), vec3(7.5, -2.25, -2.5) );
	CybertrackModel[8] = mat3x3( vec3(7.5, -2.25, -2.25), vec3(7.5, -2.25, -2.5), vec3(6.5, -3.5, -2.25) );
	CybertrackModel[9] = mat3x3( vec3(7.5, -2.25, -2.5), vec3(6.5, -3.5, -2.25), vec3(6.5, -3.5, -2.6) );
	CybertrackModel[10] = mat3x3( vec3(7.5, 2.25, -2.25), vec3(7.5, 2.25, -2.5), vec3(6.5, 3.5, -2.25) );
	CybertrackModel[11] = mat3x3( vec3(7.5, 2.25, -2.5), vec3(6.5, 3.5, -2.25), vec3(6.5, 3.5, -2.6) );
	CybertrackModel[12] = mat3x3( vec3(7.5, -2.25, -2.5), vec3(7.5, 2.25, -2.5), vec3(4.0, 3.5, -3.25) );
	CybertrackModel[13] = mat3x3( vec3(4.0, 3.5, -3.25), vec3(7.5, -2.25, -2.5), vec3(4.0, -3.5, -3.25) );
	CybertrackModel[14] = mat3x3( vec3(7.5, -2.25, -2.5), vec3(6.5, -3.5, -2.6), vec3(4.0, -3.5, -3.25) );
	CybertrackModel[15] = mat3x3( vec3(7.5, 2.25, -2.5), vec3(6.5, 3.5, -2.6), vec3(4.0, 3.5, -3.25) );
	CybertrackModel[16] = mat3x3( vec3(4.0, 3.5, -3.25), vec3(-2.5, -3.0, -5.5), vec3(-2.5, 3.0, -5.5) );
	CybertrackModel[17] = mat3x3( vec3(4.0, -3.5, -3.25), vec3(4.0, 3.5, -3.25), vec3(-2.5, -3.0, -5.5) );

	CybertrackModel[18] = mat3x3( vec3(7.0, 3.5, -0.25), vec3(6.5, 3.5, -2.6), vec3(4.5, 3.5, -2.0) );
	CybertrackModel[19] = mat3x3( vec3(6.5, 3.5, -2.6), vec3(4.5, 3.5, -2.0), vec3(2.75, 3.5, -2.6) );
	CybertrackModel[20] = mat3x3( vec3(7.0, 3.5, -0.25), vec3(4.5, 3.5, -2.0), vec3(5.5, 3.5, -0.25) );
	CybertrackModel[21] = mat3x3( vec3(4.5, 3.5, -2.0), vec3(2.75, 3.5, -2.6), vec3(1.75, 3.5, -2.0) );
	CybertrackModel[22] = mat3x3( vec3(6.5, 3.5, -2.6), vec3(2.75, 3.5, -2.6), vec3(4.0, 3.5, -3.25) );
	CybertrackModel[23] = mat3x3( vec3(2.75, 3.5, -2.6), vec3(1.75, 3.5, -0.25), vec3(-5.0, 3.5, -3.0) );
	CybertrackModel[24] = mat3x3( vec3(1.75, 3.5, -0.25), vec3(-4.0, 3.5, -0.25), vec3(-5.0, 3.5, -3.0) );
	CybertrackModel[25] = mat3x3( vec3(-7.25, 3.5, -2.0), vec3(-4.5, 3.5, -2.0), vec3(-5.0, 3.5, -3.0) );
	CybertrackModel[26] = mat3x3( vec3(-7.25, 3.5, -2.0), vec3(-4.0, 3.5, -2.95), vec3(-10.5, 3.5, -3.3) );
	CybertrackModel[27] = mat3x3( vec3(-7.25, 3.5, -2.0), vec3(-8.0, 3.5, -0.25), vec3(-10.5, 3.5, -3.3) );
	CybertrackModel[28] = mat3x3( vec3(-8.0, 3.5, -0.25), vec3(-10.0, 3.5, -0.6), vec3(-10.5, 3.5, -3.3) );
	CybertrackModel[29] = mat3x3( vec3(4.0, 3.5, -3.25), vec3(5.5, 3.5, -2.25), vec3(-5.0, 3.5, -3.0) );
	CybertrackModel[30] = mat3x3( vec3(4.0, 3.5, -3.25), vec3(-5.0, 3.5, -3.0), vec3(-10.5, 3.5, -3.3) );
	CybertrackModel[31] = mat3x3( vec3(-10.5, 3.5, -3.3), vec3(-5.5, 3.19, -4.67), vec3(-5.0, 3.5, -3.27) );
	CybertrackModel[32] = mat3x3( vec3(4.0, 3.5, -3.25), vec3(-2.5, 3.0, -5.5), vec3(-5.0, 3.5, -3.27) );

	CybertrackModel[33] = mat3x3( vec3(7.0, -3.5, -0.25), vec3(6.5, -3.5, -2.6), vec3(4.5, -3.5, -2.0) );
	CybertrackModel[34] = mat3x3( vec3(6.5, -3.5, -2.6), vec3(4.5, -3.5, -2.0), vec3(2.75, -3.5, -2.6) );
	CybertrackModel[35] = mat3x3( vec3(7.0, -3.5, -0.25), vec3(4.5, -3.5, -2.0), vec3(5.5, -3.5, -0.25) );
	CybertrackModel[36] = mat3x3( vec3(4.5, -3.5, -2.0), vec3(2.75, -3.5, -2.6), vec3(1.75, -3.5, -2.0) );
	CybertrackModel[37] = mat3x3( vec3(6.5, -3.5, -2.6), vec3(2.75, -3.5, -2.6), vec3(4.0, -3.5, -3.25) );
	CybertrackModel[38] = mat3x3( vec3(2.75, -3.5, -2.6), vec3(1.75, -3.5, -0.25), vec3(-5.0, -3.5, -3.0) );
	CybertrackModel[39] = mat3x3( vec3(1.75, -3.5, -0.25), vec3(-4.0, -3.5, -0.25), vec3(-5.0, -3.5, -3.0) );
	CybertrackModel[40] = mat3x3( vec3(-7.25, -3.5, -2.0), vec3(-4.5, -3.5, -2.0), vec3(-5.0, -3.5, -3.0) );
	CybertrackModel[41] = mat3x3( vec3(-7.25, -3.5, -2.0), vec3(-4.0, -3.5, -2.95), vec3(-10.5, -3.5, -3.3) );
	CybertrackModel[42] = mat3x3( vec3(-7.25, -3.5, -2.0), vec3(-8.0, -3.5, -0.25), vec3(-10.5, -3.5, -3.3) );
	CybertrackModel[43] = mat3x3( vec3(-8.0, -3.5, -0.25), vec3(-10.0, -3.5, -0.6), vec3(-10.5, -3.5, -3.3) );
	CybertrackModel[44] = mat3x3( vec3(4.0, -3.5, -3.25), vec3(5.5, -3.5, -2.25), vec3(-5.0, -3.5, -3.0) );
	CybertrackModel[45] = mat3x3( vec3(4.0, -3.5, -3.25), vec3(-5.0, -3.5, -3.0), vec3(-10.5, -3.5, -3.3) );
	CybertrackModel[46] = mat3x3( vec3(-10.5, -3.5, -3.3), vec3(-5.5, -3.19, -4.67), vec3(-5.0, -3.5, -3.27) );
	CybertrackModel[47] = mat3x3( vec3(4.0, -3.5, -3.25), vec3(-2.5, -3.0, -5.5), vec3(-5.0, -3.5, -3.27) );

	CybertrackModel[48] = mat3x3( vec3(7.0, -3.5, -0.25), vec3(7.0, 3.5, -0.25), vec3(5.5, -3.5, -0.25) );
	CybertrackModel[49] = mat3x3( vec3(7.0, 3.5, -0.25), vec3(5.5, 3.5, -0.25), vec3(5.5, -3.5, -0.25) );
	CybertrackModel[50] = mat3x3( vec3(4.5, -3.5, -2.0), vec3(4.5, 3.5, -2.0), vec3(2.5, -3.5, -2.0) );
	CybertrackModel[51] = mat3x3( vec3(4.5, 3.5, -2.0), vec3(2.5, 3.5, -2.0), vec3(2.5, -3.5, -2.0) );
	CybertrackModel[52] = mat3x3( vec3(1.75, -3.5, -0.25), vec3(1.75, 3.5, -0.25), vec3(-4.0, -3.5, -0.25) );
	CybertrackModel[53] = mat3x3( vec3(1.75, 3.5, -0.25), vec3(-4.0, 3.5, -0.25), vec3(-4.0, -3.5, -0.25) );
	CybertrackModel[54] = mat3x3( vec3(-4.55, -3.5, -2.0), vec3(-4.55, 3.5, -2.0), vec3(-7.25, -3.5, -2.0) );
	CybertrackModel[55] = mat3x3( vec3(-4.55, 3.5, -2.0), vec3(-7.25, 3.5, -2.0), vec3(-7.25, -3.5, -2.0) );
	CybertrackModel[56] = mat3x3( vec3(-8.0, -3.5, -0.25), vec3(-8.0, 3.5, -0.25), vec3(-10.0, -3.5, -0.6) );
	CybertrackModel[57] = mat3x3( vec3(-8.0, 3.5, -0.25), vec3(-10.0, 3.5, -0.6), vec3(-10.0, -3.5, -0.6) );
	CybertrackModel[58] = mat3x3( vec3(4.5, -3.5, -2.0), vec3(5.5, 3.5, -0.25), vec3(5.5, -3.5, -0.25) );
	CybertrackModel[59] = mat3x3( vec3(4.5, -3.5, -2.0), vec3(4.5, 3.5, -2.0), vec3(5.5, 3.5, -0.25) );
	CybertrackModel[60] = mat3x3( vec3(1.75, -3.5, -0.25), vec3(2.5, 3.5, -2.0), vec3(2.5, -3.5, -2.0) );
	CybertrackModel[61] = mat3x3( vec3(1.75, -3.5, -0.25), vec3(1.75, 3.5, -0.25), vec3(2.5, 3.5, -2.0) );
	CybertrackModel[62] = mat3x3( vec3(-4.0, 3.5, -0.25), vec3(-4.55, 3.5, -2.0), vec3(-4.0, -3.5, -0.25) );
	CybertrackModel[63] = mat3x3( vec3(-4.55, -3.5, -2.0), vec3(-4.55, 3.5, -2.0), vec3(-4.0, -3.5, -0.25) );
	CybertrackModel[64] = mat3x3( vec3(-8.0, 3.5, -0.25), vec3(-7.25, 3.5, -2.0), vec3(-8.0, -3.5, -0.25) );
	CybertrackModel[65] = mat3x3( vec3(-7.25, -3.5, -2.0), vec3(-7.25, 3.5, -2.0), vec3(-8.0, -3.5, -0.25) );

	CybertrackModel[66] = mat3x3( vec3(-2.5, -3.0, -5.5), vec3(-2.5, 3.0, -5.5), vec3(-5.5, 3.188, -4.675) );
	CybertrackModel[67] = mat3x3( vec3(-5.5, 3.188, -4.675), vec3(-2.5, -3.0, -5.5), vec3(-5.5, -3.188, -4.675) );
	CybertrackModel[68] = mat3x3( vec3(-5.35, 3.5, -2.5), vec3(-5.5, -3.188, -4.675), vec3(-5.5, 3.188, -4.675) );
	CybertrackModel[69] = mat3x3( vec3(-5.35, 3.5, -2.5), vec3(-5.35, -3.5, -2.5), vec3(-5.5, -3.188, -4.675) );
	CybertrackModel[70] = mat3x3( vec3(-5.35, 3.5, -2.5), vec3(-5.35, -3.5, -2.5), vec3(-10.35, 3.5, -2.5) );
	CybertrackModel[71] = mat3x3( vec3(-5.35, -3.5, -2.5), vec3(-10.35, -3.5, -2.5), vec3(-10.35, 3.5, -2.5) );
	CybertrackModel[72] = mat3x3( vec3(-10.0, 3.5, -0.6), vec3(-10.46, -3.5, -3.1), vec3(-10.46, 3.5, -3.1) );
	CybertrackModel[73] = mat3x3( vec3(-10.0, 3.5, -0.6), vec3(-10.0, -3.5, -0.6), vec3(-10.46, -3.5, -3.1) );
	CybertrackModel[74] = mat3x3( vec3(-10.5, 3.5, -3.3), vec3(-10.46, -3.5, -3.1), vec3(-10.46, 3.5, -3.1) );
	CybertrackModel[75] = mat3x3( vec3(-10.5, 3.5, -3.3), vec3(-10.5, -3.5, -3.3), vec3(-10.46, -3.5, -3.1) );
	CybertrackModel[76] = mat3x3( vec3(-5.35, 3.5, -2.5), vec3(-5.5, 3.188, -4.675), vec3(-5.4, 3.5, -3.27) );
	CybertrackModel[77] = mat3x3( vec3(-5.35, -3.5, -2.5), vec3(-5.5, -3.188, -4.675), vec3(-5.4, -3.5, -3.27) );
	CybertrackModel[78] = mat3x3( vec3(-2.5, 3.0, -5.5), vec3(-5.5, 3.19, -4.67), vec3(-5.0, 3.5, -3.27) );
	CybertrackModel[79] = mat3x3( vec3(-2.5, -3.0, -5.5), vec3(-5.5, -3.19, -4.67), vec3(-5.0, -3.5, -3.27) );

	for (int i = 0; i < CybertrackModel.length(); i++) {
		it = vec2(triIntersection(ro, rd, CybertrackModel[i][0], CybertrackModel[i][1], CybertrackModel[i][2]));
		if(it.x > 0.0 && it.x < minIt.x) {
			minIt = it;
			vec3 itPos = ro + rd * it.x;
			n = normalize(itPos - triIntersection(ro, rd, CybertrackModel[i][0], CybertrackModel[i][1], CybertrackModel[i][2]));
			if (i == 74 || i == 75) col = vec4(0.8, 0.0, 0.0, -2.0);
			else if (i > 5 && i < 12) col = vec4(1.0, 1.0, 1.0, -2.0);
			else if (i == 16 || i == 17 || i == 32 || i == 47 || i == 78 || i == 79) col = vec4(0.1, 0.1, 0.1, 0.7);
			else col = vec4(0.6, 0.55, 0.45, 0.5);
		}
	}

	mat2x3 Cylinders[5];
	Cylinders[0][0] = vec3(3.5, 3.4, -0.4);
	Cylinders[0][1] = vec3(3.5, 1.9, -0.4);
	Cylinders[1][0] = vec3(3.5, -3.4, -0.4);
	Cylinders[1][1] = vec3(3.5, -1.9, -0.4);
	Cylinders[2][0] = vec3(-6.0, 3.4, -0.425);
	Cylinders[2][1] = vec3(-6.0, 1.9, -0.425);
	Cylinders[3][0] = vec3(-6.0, -1.9, -0.425);
	Cylinders[3][1] = vec3(-6.0, -3.4, -0.425);
	Cylinders[4][0] = vec3(37.0 + move(4.0, 7.0, 0.0), 3.0, 0.5);
	Cylinders[4][1] = vec3(39.0 - move(4.0, 7.0, 0.0), 4.0, 0.5);

	float cylRad[5];
	cylRad[0] = 1.4;
	cylRad[1] = 1.4;
	cylRad[2] = 1.44;
	cylRad[3] = 1.44;
	cylRad[4] = 0.5;

	for(int i = 0; i < Cylinders.length(); i++) {
		it = vec2(cylIntersection(ro, rd, Cylinders[i][0], Cylinders[i][1], cylRad[i]));
		if(it.x > 0.0 && it.x < minIt.x) {
			minIt = it;
			vec3 itPos = ro + rd * it.x;
			n = normalize(itPos - vec3(cylIntersection(ro, rd, Cylinders[i][0], Cylinders[i][1], cylRad[i])));
			if (i < 4) col = vec4(0.15, 0.12, 0.1, 0.3);
			else col = vec4(1.0, 0.4, 0.0, 0.7);
		}
	}

	if(minIt.x == MAX_DIST) return vec4(getSky(rd), -2.0);
	if(col.a == -2.0) return col;
	vec3 reflected = reflect(rd, n);
	if(col.a < 0.0) {
		float fresnel = 1.0 - abs(dot(-rd, n));
		if(random() - 0.1 < fresnel * fresnel) {
			rd = reflected;
			return col;
		}
		ro += rd * (minIt.y + 0.001);
		rd = refract(rd, n, 1.0 / (1.0 - col.a));
		return col;
	}
	vec3 itPos = ro + rd * it.x;
	vec3 r = randomOnSphere();
	vec3 diffuse = normalize(r * dot(r, n));
	ro += rd * (minIt.x - 0.001);
	rd = mix(diffuse, reflected, col.a);
	return col;
}

vec3 traceRay(vec3 ro, vec3 rd) {
	vec3 col = vec3(1.0);
	for(int i = 0; i < MAX_REF; i++)
	{
		vec4 refCol = castRay(ro, rd);
		col *= refCol.rgb;
		if(refCol.a == -2.0) return col;
	}
	return vec3(0.0);
}

void main() {
	vec2 uv = (gl_TexCoord[0].xy - 0.5) * u_resolution / u_resolution.y;
	vec2 uvRes = hash22(uv + 1.0) * u_resolution + u_resolution;
	R_STATE.x = uint(u_seed1.x + uvRes.x);
	R_STATE.y = uint(u_seed1.y + uvRes.x);
	R_STATE.z = uint(u_seed2.x + uvRes.y);
	R_STATE.w = uint(u_seed2.y + uvRes.y);
	vec3 rayOrigin = u_pos;
	vec3 rayDirection = normalize(vec3(1.0, uv));
	rayDirection.zx *= rot(-u_mouse.y);
	rayDirection.xy *= rot(u_mouse.x);
	vec3 col = vec3(0.0);
	int samples = u_rays;
	for(int i = 0; i < samples; i++) {
		col += traceRay(rayOrigin, rayDirection);
	}
	col /= samples;
	float white = 20.0;
	col *= white * 16.0;
	col = (col * (1.0 + col / white / white)) / (1.0 + col);
	vec3 sampleCol = texture(u_sample, gl_TexCoord[0].xy).rgb;
	col = mix(sampleCol, col, u_sample_part);
	gl_FragColor = vec4(col, 1.0);
}
