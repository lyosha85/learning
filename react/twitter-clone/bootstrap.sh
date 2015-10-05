# updates
sudo apt-get update
sudo apt-get install git-core curl zlib1g-dev build-essential libssl-dev libreadline-dev libyaml-dev libsqlite3-dev sqlite3 libxml2-dev libxslt1-dev libcurl4-openssl-dev python-software-properties libffi-dev -y

# language
sudo update-locale LANG=en_US.UTF-8 LANGUAGE=en_US.UTF-8 LC_ALL=en_US.UTF-8

# rbenv
git clone https://github.com/sstephenson/rbenv.git ~/.rbenv
echo 'export PATH="$HOME/.rbenv/bin:$PATH"' >> ~/.bash_profile
echo 'eval "$(rbenv init -)"' >> ~/.bash_profile
source ~/.bash_profile

# rbenv - ruby build
git clone https://github.com/sstephenson/ruby-build.git ~/.rbenv/plugins/ruby-build

# install ruby 2.2.3
rbenv install 2.2.3
rbenv global 2.2.3

# install bundler
gem install bundler

# install nvm
git clone https://github.com/creationix/nvm.git ~/.nvm && cd ~/.nvm && git checkout `git describe --abbrev=0 --tags`
source ~/.nvm/nvm.sh

# install node
nvm install iojs
echo 'source ~/.nvm/nvm.sh' >> ~/.bash_profile
nvm alias default iojs

# disable bin-links
npm config set bin-links false

# add postgresql repo
wget -O - http://apt.postgresql.org/pub/repos/apt/ACCC4CF8.asc | sudo apt-key add -

sudo bash -c "echo 'deb http://apt.postgresql.org/pub/repos/apt/ precise-pgdg main' > /etc/apt/sources.list.d/pgdg.list"
sudo bash -c "echo 'Package: *\nPin: release o=apt.postgresql.org\nPin-Priority: 500' > /etc/apt/preferences.d/pgdg.pref"
sudo apt-get update
sudo apt-get install pgdg-keyring

# install postgresql
sudo apt-get install postgresql-common -y
sudo apt-get install postgresql-9.3 libpq-dev postgresql-contrib-9.3 -y

# create the developer user
sudo -u postgres createuser vagrant -s
sudo -u postgres psql -c "alter user vagrant with superuser;"

# install java 7
sudo add-apt-repository ppa:webupd8team/java
sudo apt-get -q -y update

sudo bash -c 'echo debconf shared/accepted-oracle-license-v1-1 select true | debconf-set-selections'
sudo bash -c 'echo debconf shared/accepted-oracle-license-v1-1 seen true | debconf-set-selections'

sudo apt-get -y install oracle-java7-installer
sudo bash -c 'echo -e "\n\nJAVA_HOME=/usr/lib/jvm/java-7-oracle" >> /etc/environment'
echo export JAVA_HOME=/usr/lib/jvm/java-7-oracle/ >> ~/.bash_profile
source ~/.bash_profile

# install elasticsearch
wget https://download.elasticsearch.org/elasticsearch/elasticsearch/elasticsearch-0.90.7.deb
sudo dpkg -i elasticsearch-0.90.7.deb
rm elasticsearch-0.90.7.deb

# capybara dependencies
sudo apt-get install libqt4-dev -y
