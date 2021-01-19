void main() {
	vec2 uv = gl_TexCoord[0].xy;
	gl_FragColor = vec4(uv, 0.0, 1.0);
}