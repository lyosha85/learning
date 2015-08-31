require 'sinatra'
require 'sinatra/reloader' if development?

get '/' do
  erb :home
end

get '/about' do
  erb :about
end

get '/contact' do
  erb :about
end

__END__
@@layout

<% title = "Songs" %>

<!doctype html>
<html lang="en">
<head>
  <title><%= title %></title>
  <meta charset="utf-8">
</head>
<body>
  <header>
    <h1><%= title %></h1>
    <nav>
      <ul>
        <li><a href="/" title="Home">Home</a></li>
        <li><a href="/about" title="About">About</a></li>
        <li><a href="/contact" title="Contact">Contact</a></li>
</ul> </nav>
  </header>
  <section>
    <%= yield %>
  </section>
</body>
</html>

@@home
<p> Welcome to the home page </p>

@@about
<p> Welcome to the about page </p>

@@contact
<p> Welcome to the about page </p>
