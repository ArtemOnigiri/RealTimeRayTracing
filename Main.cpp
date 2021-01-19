#include <SFML/Graphics.hpp>

int main()
{
	int w = 1920;
	int h = 1080;
	int mouseX = w / 2;
	int mouseY = h / 2;
	float mouseSensitivity = 3.0f;
	bool mouseHidden = true;
	bool wasdUD[6] = { false, false, false, false, false, false };
	sf::Vector3f pos = sf::Vector3f(-5.0f, 0.0f, 0.0f);
	sf::Clock clock;

	sf::RenderWindow window(sf::VideoMode(w, h), "Ray tracing", sf::Style::Titlebar | sf::Style::Close);
	window.setFramerateLimit(60);
	window.setMouseCursorVisible(false);
	
	sf::RenderTexture emptyTexture;
	emptyTexture.create(w, h);
	sf::Sprite emptySprite = sf::Sprite(emptyTexture.getTexture());
	sf::Shader shader;
	shader.loadFromFile("OutputShader.frag", sf::Shader::Fragment);
	shader.setUniform("u_resolution", sf::Vector2f(w, h));

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
					mouseX += event.mouseMove.x - w / 2;
					mouseY += event.mouseMove.y - h / 2;
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
				else if (event.key.code == sf::Keyboard::LShift) wasdUD[5] = true;
			}
			else if (event.type == sf::Event::KeyReleased)
			{
				if (event.key.code == sf::Keyboard::W) wasdUD[0] = false;
				else if (event.key.code == sf::Keyboard::A) wasdUD[1] = false;
				else if (event.key.code == sf::Keyboard::S) wasdUD[2] = false;
				else if (event.key.code == sf::Keyboard::D) wasdUD[3] = false;
				else if (event.key.code == sf::Keyboard::Space) wasdUD[4] = false;
				else if (event.key.code == sf::Keyboard::LShift) wasdUD[5] = false;
			}
		}
		if (mouseHidden)
		{
			sf::Vector3f dir = sf::Vector3f(0.0f, 0.0f, 0.0f);
			if (wasdUD[0]) dir = sf::Vector3f(1.0f, 0.0f, 0.0f);
			else if (wasdUD[2]) dir = sf::Vector3f(-1.0f, 0.0f, 0.0f);
			if (wasdUD[1]) dir += sf::Vector3f(0.0f, -1.0f, 0.0f);
			else if (wasdUD[3]) dir += sf::Vector3f(0.0f, 1.0f, 0.0f);
			pos += dir * 0.1f;
			if (wasdUD[4]) pos.z -= 0.1;
			else if (wasdUD[5]) pos.z += 0.1;
			shader.setUniform("u_pos", pos);
			float mx = ((float)mouseX / w - 0.5f) * mouseSensitivity;
			float my = ((float)mouseY / h - 0.5f) * mouseSensitivity;
			shader.setUniform("u_mouse", sf::Vector2f(mx, my));
			shader.setUniform("u_time", clock.getElapsedTime().asSeconds());
			window.draw(emptySprite, &shader);
		}
		window.display();
	}
	return 0;
}
