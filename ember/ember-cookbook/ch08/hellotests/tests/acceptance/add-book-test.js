import { test } from 'qunit';
import moduleForAcceptance from 'hellotests/tests/helpers/module-for-acceptance';

moduleForAcceptance('Acceptance | add book');

test('visiting /add-book', function(assert) {
  visit('/add-book');
  fillIn('input','newbook');
  click('button');

  andThen(function() {
    assert.equal(currentURL(), '/add-book');
  });
});
