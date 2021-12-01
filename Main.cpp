#include <random>
#include <SFML/Graphics.hpp>
#include <iostream>

int main()
{
	int w = 1920;
	int h = 1080;
	int mouseX = w / 2;
	int mouseY = h / 2;
	float mouseSensitivity = 3.0f;
	float speed = 0.3f;
	bool mouseHidden = true;
	bool wasdUD[6] = { false, false, false, false, false, false };
	sf::Vector3f pos = sf::Vector3f(25.0f, 10.0f, -3.0f);
	sf::Clock clock;
	int samples = 20;
	float lightSpeed = 0.0001f;
	sf::Vector2f lightPos = sf::Vector2f(0.0f, -1.0f);
	bool is_rising = false;
	int frames = 0, s = 0, fps = 0, minFps;
	sf::Vector2i delta = sf::Vector2i(1, 1);

	sf::RenderWindow window(sf::VideoMode(w, h), "Ray tracing", sf::Style::Titlebar | sf::Style::Close);
	window.setFramerateLimit(60);
	window.setMouseCursorVisible(false);

	sf::RenderTexture firstTexture;
	firstTexture.create(w, h);
	sf::Sprite firstTextureSprite = sf::Sprite(firstTexture.getTexture());
	sf::Sprite firstTextureSpriteFlipped = sf::Sprite(firstTexture.getTexture());
	firstTextureSpriteFlipped.setScale(1, -1);
	firstTextureSpriteFlipped.setPosition(0, h);

	sf::RenderTexture outputTexture;
	outputTexture.create(w, h);
	sf::Sprite outputTextureSprite = sf::Sprite(outputTexture.getTexture());
	sf::Sprite outputTextureSpriteFlipped = sf::Sprite(firstTexture.getTexture());
	outputTextureSpriteFlipped.setScale(1, -1);
	outputTextureSpriteFlipped.setPosition(0, h);

	sf::Shader shader;
	shader.loadFromFile("Shader.frag", sf::Shader::Fragment);
	shader.setUniform("u_resolution", sf::Vector2f(w, h));

	sf::Texture texture;
	texture.loadFromFile("textures/texture.jpg");
	sf::Texture brickTexture;
	brickTexture.loadFromFile("textures/brick.jpg");
	sf::Texture woodTexture;
	woodTexture.loadFromFile("textures/wood.jpg");
	sf::Texture marbleTexture;
	marbleTexture.loadFromFile("textures/marble.jpg");

	shader.setUniform("u_texture", texture);
	shader.setUniform("u_brick_texture", brickTexture);
	shader.setUniform("u_wood_texture", woodTexture);
	shader.setUniform("u_marble_texture", marbleTexture);

	std::random_device rd;
	std::mt19937 e2(rd());
	std::uniform_real_distribution<> dist(0.0f, 1.0f);

	while (window.isOpen())
	{
		sf::Event event;
		while (window.pollEvent(event))
		{
			if (event.type == sf::Event::Closed)
			{
				window.close();
			}
			else if (event.type == sf::Event::MouseMoved)
			{
				if (mouseHidden)
				{
					int mx = event.mouseMove.x - w / 2;
					int my = event.mouseMove.y - h / 2;
					mouseX += mx;
					mouseY += my;
					sf::Mouse::setPosition(sf::Vector2i(w / 2, h / 2), window);
				}
			}
			else if (event.type == sf::Event::MouseButtonPressed)
			{
				window.setMouseCursorVisible(false);
				mouseHidden = true;
			}
			else if (event.type == sf::Event::KeyPressed)
			{
				if (event.key.code == sf::Keyboard::Escape)
				{
					window.setMouseCursorVisible(true);
					mouseHidden = false;
				}
				else if (event.key.code == sf::Keyboard::W) wasdUD[0] = true;
				else if (event.key.code == sf::Keyboard::A) wasdUD[1] = true;
				else if (event.key.code == sf::Keyboard::S) wasdUD[2] = true;
				else if (event.key.code == sf::Keyboard::D) wasdUD[3] = true;
				else if (event.key.code == sf::Keyboard::Space) wasdUD[4] = true;
				else if (event.key.code == sf::Keyboard::C) wasdUD[5] = true;
				else if (event.key.code == sf::Keyboard::LShift) speed = 0.6f;
			}
			else if (event.type == sf::Event::KeyReleased)
			{
				if (event.key.code == sf::Keyboard::W) wasdUD[0] = false;
				else if (event.key.code == sf::Keyboard::A) wasdUD[1] = false;
				else if (event.key.code == sf::Keyboard::S) wasdUD[2] = false;
				else if (event.key.code == sf::Keyboard::D) wasdUD[3] = false;
				else if (event.key.code == sf::Keyboard::Space) wasdUD[4] = false;
				else if (event.key.code == sf::Keyboard::C) wasdUD[5] = false;
				else if (event.key.code == sf::Keyboard::LShift) speed = 0.3f;
			}
		}
		if (mouseHidden)
		{
			float mx = ((float)mouseX / w - 0.5f) * mouseSensitivity;
			float my = ((float)mouseY / h - 0.5f) * mouseSensitivity;
			sf::Vector3f dir = sf::Vector3f(0.0f, 0.0f, 0.0f);
			sf::Vector3f dirTemp;
			if (wasdUD[0]) dir = sf::Vector3f(1.0f, 0.0f, 0.0f);
			else if (wasdUD[2]) dir = sf::Vector3f(-1.0f, 0.0f, 0.0f);
			if (wasdUD[1]) dir += sf::Vector3f(0.0f, -1.0f, 0.0f);
			else if (wasdUD[3]) dir += sf::Vector3f(0.0f, 1.0f, 0.0f);
			dirTemp.z = dir.z * cos(-my) - dir.x * sin(-my);
			dirTemp.x = dir.z * sin(-my) + dir.x * cos(-my);
			dirTemp.y = dir.y;
			dir.x = dirTemp.x * cos(mx) - dirTemp.y * sin(mx);
			dir.y = dirTemp.x * sin(mx) + dirTemp.y * cos(mx);
			dir.z = dirTemp.z;
			pos += dir * speed;
			if (wasdUD[4]) pos.z -= speed;
			else if (wasdUD[5]) pos.z += speed;

			if (lightPos.y < 1 && !is_rising) {
				lightPos.y += lightSpeed;
				lightPos.x -= lightSpeed;
			}
			else if (lightPos.y > 1 && !is_rising) {
				lightPos.x = 2.0f;
				is_rising = true;
			}
			if (lightPos.y > -1 && is_rising) {
				lightPos.y -= lightSpeed;
				lightPos.x -= lightSpeed;
			}
			else if (lightPos.y <= -1 && is_rising) {
				is_rising = false;
			}

			shader.setUniform("u_light", lightPos);
			shader.setUniform("u_pos", pos);
			shader.setUniform("u_samples", samples > 0 ? samples : 1);
			shader.setUniform("u_mouse", sf::Vector2f(mx, my));
			shader.setUniform("u_time", clock.getElapsedTime().asSeconds());
			shader.setUniform("u_seed1", sf::Vector2f((float)dist(e2), (float)dist(e2)) * 999.0f);
			shader.setUniform("u_seed2", sf::Vector2f((float)dist(e2), (float)dist(e2)) * 999.0f);
			outputTexture.draw(firstTextureSpriteFlipped, &shader);
			window.draw(outputTextureSprite);
			window.display();

			if ((int)clock.getElapsedTime().asSeconds() - s) {
				s = clock.getElapsedTime().asSeconds();
				fps = frames;
				frames = 0;
				minFps = 15 + lightPos.y * -5;
				if (fps > minFps + 3) {
					samples += delta.x;
					delta = sf::Vector2i(delta.x + 1, 1);
				}
				else if (fps < minFps && samples > delta.y) {
					samples -= delta.y;
					delta = sf::Vector2i(1, delta.y + 1);
				}
				else { delta = sf::Vector2i(1, 1); }
				std::cout << "FPS: " << fps << ", Samples: " << samples << std::endl;
			}
			frames++;
		}
	}
	return 0;
}