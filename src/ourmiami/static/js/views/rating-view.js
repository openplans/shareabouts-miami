/*globals _ Handlebars Backbone */

var Shareabouts = Shareabouts || {};

(function(S, $, console){
  'use strict';

  S.RatingView = Backbone.View.extend({
    events: {
      'click .star': 'onStarClick',
      'change input[name=rating]': 'onRatingChange',
      'change input[name=optout]': 'onOptOutStateChange',
      'blur input[name=optout_reason]': 'onOptOutReasonBlur',
      'submit .user-rating': 'onFormSubmit'
    },

    initialize: function() {
      this.collection.on('reset', this.onChange, this);
      this.collection.on('add', this.onChange, this);
      this.collection.on('remove', this.onChange, this);
    },

    render: function() {
      var self = this,
          userRating,

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

      userRating = this.getRating();
      this.$el.html(Handlebars.templates['place-detail-rating']({
        count: this.collection.size() || '',
        user_token: this.options.userToken,
        user_rating: userRating.toJSON(),
        place_id: this.collection.options.placeModel.id
      }));

      return this;
    },

    remove: function() {
      // Nothing yet
    },

    unbindRating: function() {
      if (this.userRating) { this.userRating.off('change', this.onChange, this); }
    },
    bindRating: function() {
      if (this.userRating) { this.userRating.on('change', this.onChange, this); }
    },

    getRating: function() {
      var userToken = this.options.userToken,
          ratings = this.collection,
          RatingModel = ratings.model,
          model = this.collection.findWhere({'user_token': userToken});

      if (!this.userRating || (model && this.userRating !== model)) {
        this.unbindRating();
        this.userRating = model || new RatingModel();
        this.bindRating();
      }

      if (this.userRating.isNew()) {
        this.userRating.urlRoot = ratings.url();
      }

      return this.userRating;
    },

    onChange: function() {
      this.render();
    },

    onFormSubmit: function(evt) {
      evt.preventDefault();
      this.saveRating();
    },

    onOptOutStateChange: function(evt) {
      S.Util.log('USER', 'place', 'rating-optout-click', this.collection.options.placeModel.getLoggingDetails());
      this.saveRating();
    },

    onOptOutReasonBlur: function(evt) {
      var userRating = this.getRating(),
          oldReason = userRating.get('optout_reason'),
          newReason = $(evt.currentTarget).val();

      S.Util.log('USER', 'place', 'rating-optout-click', this.collection.options.placeModel.getLoggingDetails());
      if (newReason !== oldReason) {
        this.saveRating();
      }
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
      this.saveRating();
    },

    saveRating: function() {
      var self = this,
          rating = this.$('input[name=rating]').val(),
          stars = this.el.getElementsByClassName('star'),
          optoutWidgets = $('[name=optout], [name=optout_reason]'),
          $form, attrs,
          ratings = this.collection,
          RatingModel = ratings.model,
          userRating = this.getRating();

      // Disable the stars while we save; they'll be enabled again on complete
      _.map(stars, function(star) { star.disabled = true; });
      optoutWidgets.each(function(i, widget) { widget.disabled = false; });

      $form = this.$('form');
      attrs = S.Util.getAttrs($form);

      // Treat optout specially, since it's a check box whose value gets set to
      // "on" when checked and is just absent when not.
      if ('optout' in attrs) {
        attrs.optout = true;
        attrs.rating = null;
      } else {
        attrs.optout = false;
      }

      userRating.save(attrs, {
        wait: true,
        beforeSend: function(xhr) {
          // Set the silent header so that rating doesn't generate activity
          xhr.setRequestHeader('X-Shareabouts-Silent', 'true');
        },
        complete: function() {
          _.map(stars, function(star) { star.disabled = false; });
          optoutWidgets.each(function(i, widget) { widget.disabled = false; });
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
