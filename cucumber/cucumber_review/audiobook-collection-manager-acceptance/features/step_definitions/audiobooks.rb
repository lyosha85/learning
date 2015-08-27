#encoding: utf-8

Given /^some audiobooks in the collection$/ do
  upload_fixtures backend_url('audiobooks'), $fixtures
end

When /^I visit the list of audiobooks$/ do
  visit ui_url '/index.html'
end

Then /^I see all audiobooks$/ do
  page.should have_content 'Coraline'
  page.should have_content 'Man In The Dark'
  page.should have_content 'Siddhartha'
end

When(/^I search for "([^"]*)"$/) do |search_term|
  fill_in('filter', with: search_term)
  @matching_titles = ['Coraline']
  @nonmatching_titles = ['Man In The Dark', 'Siddharta']
end

When(/^I remove the filter$/) do
  fill_in('filter', with: ' ')
  @matching_titles = @nonmatching_titles = nil
end

Then(/^I see all the books(?: again)?$/) do
  page.should have_content 'Coraline'
  page.should have_content 'Man In The Dark'
  page.should have_content 'Siddhartha'
end

Then(/^I only see the titles that match the term$/) do
  @matching_titles.each do |matching_title|
    page.should have_content matching_title
  end
  @nonmatching_titles.each do |nonmatching_title|
    page.should_not have_content nonmatching_title
  end
end
