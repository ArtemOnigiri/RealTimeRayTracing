#include <SFML/Graphics.hpp>

int main()
{
	int w = 1920;
	int h = 1080;
	sf::Clock clock;

	sf::RenderWindow window(sf::VideoMode(w, h), "Ray tracing", sf::Style::Titlebar | sf::Style::Close);
	window.setFramerateLimit(60);
	
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
		}
		shader.setUniform("u_time", clock.getElapsedTime().asSeconds());
		window.draw(emptySprite, &shader);
		window.display();
	}
	return 0;
}