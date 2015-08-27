When(/^I visit "(.*?)"$/) do |path|
  visit path
end

When(/^I click on the "(.*?)" link$/) do |element|
  first(:link, element).click
end
