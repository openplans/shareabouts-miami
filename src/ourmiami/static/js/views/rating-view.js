/*globals _ Handlebars Backbone */

var Shareabouts = Shareabouts || {};

(function(S, $, console){
  'use strict';

  S.RatingView = Backbone.View.extend({
    events: {
      'click .star': 'onStarClick',
      'change input[name=rating]': 'onRatingChange'
    },

    initialize: function() {
      this.collection.on('reset', this.onChange, this);
      this.collection.on('add', this.onChange, this);
      this.collection.on('remove', this.onChange, this);

      this.updateRating();
    },

    render: function() {
      var self = this,

          // The userJudgeGroup is set in an app initializer in index.html
          userJudgeGroup = S.Config.userJudgeGroup,

          // see which judging group this place is in.
          modelJudgeGroup = this.collection.options.placeModel.get("judgeGroup");

      if (!modelJudgeGroup || !userJudgeGroup || !userJudgeGroup.length) {
        return this;
      }

      // Don't judge this at all if the judge doesn't match the place juding
      // group
      if (!_.contains(userJudgeGroup, modelJudgeGroup)) {
        // show a helpful message
        this.$el.html('<p class="user-rating-prompt" style="margin-bottom:1em">No judging required</p>');

        return this;
      }

      // I don't understand why we need to redelegate the event here, but they
      // are definitely unbound after the first render.
      this.delegateEvents();

      Handlebars.registerHelper('is_star_filled', function(starNum, options) {
        return (self.userRating && self.userRating.get('rating') >= starNum ? options.fn(this) : options.inverse(this));
      });

      this.$el.html(Handlebars.templates['place-detail-rating']({
        count: this.collection.size() || '',
        user_token: this.options.userToken,
        has_rated: (this.userRating !== undefined),
        user_rating: this.userRating,
      }));

      return this;
    },

    remove: function() {
      // Nothing yet
    },

    getRating: function(userToken) {
      return this.collection.find(function(model) {
        return model.get('user_token') === userToken;
      });
    },

    updateRating: function() {
      if (this.userRating) { this.userRating.off('change', this.onChange, this); }
      this.userRating = this.getRating(this.options.userToken);
      if (this.userRating) { this.userRating.on('change', this.onChange, this); }
      return this.userRating;
    },

    onChange: function() {
      this.updateRating();
      this.render();
    },

    onStarClick: function(evt) {
      var ratingExpr = /rating-value-(\d)/,
          classes = evt.target.getAttribute('class'),
          matches = ratingExpr.exec(classes),
          rating = matches[1];

      S.Util.log('USER', 'place', 'rating-btn-click', this.collection.options.placeModel.getLoggingDetails(), rating);
      this.$('input[name=rating]').val(rating).trigger('change');
    },

    onRatingChange: function(evt) {
      var self = this,
          rating = this.$('input[name=rating]').val(),
          stars = this.el.getElementsByClassName('star'),
          $form, attrs,
          ratings = this.collection,
          RatingModel = ratings.model,
          userRating = this.userRating || new RatingModel();

      if (userRating.isNew()) {
        userRating.urlRoot = ratings.url();
      }

      // Disable the stars while we save; they'll be enabled again on complete
      _.map(stars, function(star) { star.disabled = true; });

      $form = this.$('form');
      attrs = S.Util.getAttrs($form);
      userRating.save(attrs, {
        wait: true,
        beforeSend: function(xhr) {
          // Set the silent header so that rating doesn't generate activity
          xhr.setRequestHeader('X-Shareabouts-Silent', 'true');
        },
        complete: function() {
          _.map(stars, function(star) { star.disabled = false; });
        },
        success: function() {
          ratings.add(userRating);
          S.Util.log('USER', 'place', 'successfully-rate', self.collection.options.placeModel.getLoggingDetails());
        },
        error: function() {
          alert('Oh dear. It looks like that didn\'t save.');
          S.Util.log('USER', 'place', 'fail-to-rate', self.collection.options.placeModel.getLoggingDetails());
        }
      });
    }
  });

})(Shareabouts, jQuery, Shareabouts.Util.console);
