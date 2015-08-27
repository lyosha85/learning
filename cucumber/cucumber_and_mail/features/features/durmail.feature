Feature: I get durmail
  Scenario: Click the durmail button
    When I visit "/"

    And I click on the "durmail" link
    And "lyosha85dev@gmail.com" should receive an email
