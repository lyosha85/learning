FROM ruby:2.2.3

RUN apt-get update -qq && apt-get install -y build-essential

# for postgres
RUN apt-get install -y libpq-dev

# for nokogiri
RUN apt-get install -y libxml2-dev libxslt1-dev

# for capybara
RUN apt-get install -y libqt4-webkit libqt4-dev xvfb

# for js runtime
RUN apt-get install -y nodejs

ENV APP_HOME /oideapi
RUN mkdir $APP_HOME
WORKDIR $APP_HOME

ADD Gemfile* $APP_HOME/
RUN bundle install

ADD . $APP_HOME
