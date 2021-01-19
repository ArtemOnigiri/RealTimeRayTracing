uniform vec2 u_resolution;
uniform float u_time;

vec2 sphIntersect(in vec3 ro, in vec3 rd, float ra) {
	float b = dot(ro, rd);
	float c = dot(ro, ro) - ra * ra;
	float h = b * b - c;
	if(h < 0.0) return vec2(-1.0);
	h = sqrt(h);
	return vec2(-b - h, -b + h);
}

vec3 castRay(vec3 ro, vec3 rd) {
	vec2 it = sphIntersect(ro, rd, 1.0);
	if(it.x < 0.0) return vec3(0.0);
	vec3 itPos = ro + rd * it.x;
	vec3 n = itPos;
	vec3 light = normalize(vec3(cos(u_time), 0.75, sin(u_time)));
	float diffuse = max(0.0, dot(light, n)) * 0.5;
	float specular = max(0.0, pow(dot(reflect(rd, n), light), 32.0));
	vec3 col = diffuse + specular;
	return col;
}

void main() {
	vec2 uv = (gl_TexCoord[0].xy - 0.5) * u_resolution / u_resolution.y;
	vec3 rayOrigin = vec3(-5.0, 0.0, 0.0);
	vec3 rayDirection = normalize(vec3(1.0, uv));
	vec3 col = castRay(rayOrigin, rayDirection);
	gl_FragColor = vec4(col, 1.0);
}